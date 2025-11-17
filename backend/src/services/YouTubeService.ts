import { ICacheService } from '../interfaces/Cache';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

interface YouTubeLiveEvent {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  viewCount?: number;
  concurrentViewers?: number;
  videoUrl: string;
  status: 'live' | 'upcoming' | 'recent_video';
  isLive: boolean;
  type: 'live' | 'upcoming' | 'recent_video' | '';
}

interface YouTubeChannelResponse {
  items?: Array<{
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
}

interface YouTubePlaylistResponse {
  items?: Array<{
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        medium?: { url: string };
        default?: { url: string };
      };
      resourceId: {
        videoId: string;
      };
      publishedAt: string;
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
      channelTitle: string;
      publishedAt: string;
      liveBroadcastContent: 'none' | 'upcoming' | 'live';
    };
    statistics?: {
      viewCount?: string;
    };
    liveStreamingDetails?: {
      scheduledStartTime?: string;
      actualStartTime?: string;
      actualEndTime?: string;
      concurrentViewers?: string;
    };
  }>;
}

export class YouTubeService {
  private logger = getLogger('YouTubeService');
  private errorHandler = getErrorHandler();
  private readonly CACHE_KEY = 'youtube:live-events';
  private readonly CACHE_TTL = 3 * 60 * 60; // 3 hours cache
  private readonly API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

  constructor(private cacheService?: ICacheService) {}

  private getApiKey(): string {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }
    return apiKey;
  }

  private getChannelId(): string {
    let channelId = process.env.YOUTUBE_CHANNEL;
    if (!channelId) {
      throw new Error('YOUTUBE_CHANNEL is not configured');
    }
    // Remove @ symbol if present
    channelId = channelId.replace('@', '');
    return channelId;
  }

  async getLiveEvents(maxResults: number = 20): Promise<YouTubeLiveEvent[]> {
    try {
      // Check cache first
      if (this.cacheService) {
        const cached = await this.cacheService.get<YouTubeLiveEvent[]>(this.CACHE_KEY);
        if (cached) {
          this.logger.debug('Returning cached YouTube live events');
          return cached;
        }
      }

      // Fetch from YouTube API
      const apiKey = this.getApiKey();
      const channelId = this.getChannelId();
      
      // First, get channel uploads playlist ID
      const channelResponse = await fetch(
        `${this.API_BASE_URL}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
      );

      if (!channelResponse.ok) {
        throw new Error(`YouTube API error: ${channelResponse.statusText}`);
      }

      const channelData = await channelResponse.json() as YouTubeChannelResponse;
      const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        this.logger.warn('Could not find uploads playlist for channel', { channelId });
        return [];
      }

      // Step 2: Fetch videos from uploads playlist
      const playlistUrl = new URL(`${this.API_BASE_URL}/playlistItems`);
      playlistUrl.searchParams.set('part', 'snippet');
      playlistUrl.searchParams.set('playlistId', uploadsPlaylistId);
      playlistUrl.searchParams.set('maxResults', maxResults.toString());
      playlistUrl.searchParams.set('key', apiKey);

      const playlistResponse = await fetch(playlistUrl.toString(), {
        signal: AbortSignal.timeout(10000), // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!playlistResponse.ok) {
        throw new Error(`YouTube API error: ${playlistResponse.statusText}`);
      }

      const playlistData = await playlistResponse.json() as YouTubePlaylistResponse;

      if (!playlistData.items || playlistData.items.length === 0) {
        this.logger.debug('No videos found in uploads playlist');
        const emptyResult: YouTubeLiveEvent[] = [];
        
        if (this.cacheService) {
          await this.cacheService.set(this.CACHE_KEY, emptyResult, 60);
        }
        
        return emptyResult;
      }

      // Collect all video IDs from playlist
      const videoIds: string[] = [];
      const videoSnippets: Map<string, any> = new Map();

      for (const item of playlistData.items) {
        const videoId = item.snippet?.resourceId?.videoId;
        if (videoId) {
          videoIds.push(videoId);
          videoSnippets.set(videoId, item.snippet);
        }
      }

      if (videoIds.length === 0) {
        return [];
      }

      // Step 3: Fetch detailed video information for each video
      const videoIdsString = videoIds.join(',');
      const videosUrl = new URL(`${this.API_BASE_URL}/videos`);
      videosUrl.searchParams.set('part', 'snippet,liveStreamingDetails');
      videosUrl.searchParams.set('id', videoIdsString);
      videosUrl.searchParams.set('key', apiKey);

      const videosResponse = await fetch(videosUrl.toString(), {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.statusText}`);
      }

      const videosData = await videosResponse.json() as YouTubeVideoResponse;

      // Step 4: Transform videos to our format - categorize all videos
      const events: YouTubeLiveEvent[] = [];

      for (const item of videosData.items) {
        const videoId = item.id;
        const snippet = item.snippet;
        const liveDetails = item.liveStreamingDetails;
        const playlistSnippet = videoSnippets.get(videoId);

        let status: 'live' | 'upcoming' | 'recent_video' = 'recent_video';
        let isLive = false;
        let type: 'live' | 'upcoming' | 'recent_video' | '' = 'recent_video';

        // Categorize based on liveBroadcastContent
        switch (snippet.liveBroadcastContent || 'none') {
          case 'live':
            status = 'live';
            isLive = true;
            type = 'live';
            break;
          
          case 'upcoming':
            status = 'upcoming';
            isLive = false;
            type = 'upcoming';
            break;
          
          case 'none':
            status = 'recent_video';
            isLive = false;
            type = 'recent_video';
            break;
          
          default:
            // Optional: if title contains "live", mark as empty type
            if (snippet.title.toLowerCase().includes('live')) {
              isLive = false;
              type = '';
            }
            break;
        }

        const event: YouTubeLiveEvent = {
          id: videoId,
          title: snippet.title,
          description: snippet.description,
          thumbnailUrl: playlistSnippet?.thumbnails?.medium?.url || 
                        snippet.thumbnails.medium?.url || 
                        snippet.thumbnails.default?.url || 
                        '',
          channelTitle: snippet.channelTitle,
          publishedAt: playlistSnippet?.publishedAt || snippet.publishedAt,
          scheduledStartTime: liveDetails?.scheduledStartTime,
          actualStartTime: liveDetails?.actualStartTime,
          actualEndTime: liveDetails?.actualEndTime,
          viewCount: undefined, // Not fetching statistics to match PHP
          concurrentViewers: liveDetails?.concurrentViewers ? parseInt(liveDetails.concurrentViewers) : undefined,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          status,
          isLive,
          type,
        };

        events.push(event);
      }

      // Cache the results
      if (this.cacheService) {
        await this.cacheService.set(this.CACHE_KEY, events, this.CACHE_TTL);
      }

      this.logger.info(`Fetched ${events.length} YouTube events (live, upcoming, and recent)`);
      return events;
    } catch (error) {
      this.logger.error('Failed to fetch YouTube live events', error as Error);
      this.errorHandler.handle(error as Error, { operation: 'fetch_youtube_live_events' });
      
      // Try to return cached data even if expired as fallback
      if (this.cacheService) {
        const cached = await this.cacheService.get<YouTubeLiveEvent[]>(this.CACHE_KEY);
        if (cached) {
          this.logger.warn('Returning stale cache due to API error');
          return cached;
        }
      }
      
      throw error;
    }
  }

  async refreshCache(): Promise<void> {
    try {
      if (this.cacheService) {
        await this.cacheService.del(this.CACHE_KEY);
      }
      await this.getLiveEvents();
      this.logger.info('YouTube live events cache refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh YouTube cache', error as Error);
      throw error;
    }
  }
}
