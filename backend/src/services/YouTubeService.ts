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
  status: 'upcoming' | 'live' | 'completed';
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

interface YouTubeSearchResponse {
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
}

interface YouTubeApiResponse {
  items: Array<{
    id: string | { videoId?: string };
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        high: { url: string };
        medium: { url: string };
        default: { url: string };
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
  private readonly CACHE_TTL = 300; // 5 minutes cache
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
    const channelId = process.env.YOUTUBE_CHANNEL;
    if (!channelId) {
      throw new Error('YOUTUBE_CHANNEL is not configured');
    }
    return channelId;
  }

  async getLiveEvents(): Promise<YouTubeLiveEvent[]> {
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

      // Search for live videos and upcoming live streams
      // First, search for currently live videos
      const liveSearchUrl = new URL(`${this.API_BASE_URL}/search`);
      liveSearchUrl.searchParams.set('part', 'snippet');
      liveSearchUrl.searchParams.set('channelId', channelId);
      liveSearchUrl.searchParams.set('eventType', 'live');
      liveSearchUrl.searchParams.set('type', 'video');
      liveSearchUrl.searchParams.set('maxResults', '10');
      liveSearchUrl.searchParams.set('key', apiKey);

      const liveSearchResponse = await fetch(liveSearchUrl.toString());

      if (!liveSearchResponse.ok) {
        throw new Error(`YouTube API error: ${liveSearchResponse.statusText}`);
      }

      const liveSearchData = await liveSearchResponse.json() as YouTubeSearchResponse;

      // Search for upcoming live streams
      const upcomingSearchUrl = new URL(`${this.API_BASE_URL}/search`);
      upcomingSearchUrl.searchParams.set('part', 'snippet');
      upcomingSearchUrl.searchParams.set('channelId', channelId);
      upcomingSearchUrl.searchParams.set('eventType', 'upcoming');
      upcomingSearchUrl.searchParams.set('type', 'video');
      upcomingSearchUrl.searchParams.set('maxResults', '10');
      upcomingSearchUrl.searchParams.set('key', apiKey);

      const upcomingSearchResponse = await fetch(upcomingSearchUrl.toString());

      if (!upcomingSearchResponse.ok) {
        throw new Error(`YouTube API error: ${upcomingSearchResponse.statusText}`);
      }

      const upcomingSearchData = await upcomingSearchResponse.json() as YouTubeSearchResponse;

      // Combine both results
      const allVideoIds = new Set<string>();
      
      if (liveSearchData.items) {
        liveSearchData.items.forEach((item: any) => {
          if (item.id?.videoId) {
            allVideoIds.add(item.id.videoId);
          }
        });
      }

      if (upcomingSearchData.items) {
        upcomingSearchData.items.forEach((item: any) => {
          if (item.id?.videoId) {
            allVideoIds.add(item.id.videoId);
          }
        });
      }

      if (allVideoIds.size === 0) {
        this.logger.debug('No live or upcoming events found');
        const emptyResult: YouTubeLiveEvent[] = [];
        
        // Cache empty result for shorter time (1 minute) to avoid excessive API calls
        if (this.cacheService) {
          await this.cacheService.set(this.CACHE_KEY, emptyResult, 60);
        }
        
        return emptyResult;
      }

      // Get video IDs
      const videoIds = Array.from(allVideoIds).join(',');

      // Fetch detailed video information including live streaming details
      const videosUrl = new URL(`${this.API_BASE_URL}/videos`);
      videosUrl.searchParams.set('part', 'snippet,statistics,liveStreamingDetails');
      videosUrl.searchParams.set('id', videoIds);
      videosUrl.searchParams.set('key', apiKey);

      const videosResponse = await fetch(videosUrl.toString());

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.statusText}`);
      }

      const videosData = await videosResponse.json() as YouTubeApiResponse;

      // Transform to our format - only include videos that are/were live streams
      const liveEvents: YouTubeLiveEvent[] = videosData.items
        .map((item: any) => {
          // For videos endpoint, id is a string, not an object
          const videoId = typeof item.id === 'string' ? item.id : item.id?.videoId;
          if (!videoId) return null;

          const liveDetails = item.liveStreamingDetails;
          const snippet = item.snippet;
          const stats = item.statistics;

          // Only include videos that are/were live streams
          // Check if it has liveBroadcastContent indicating it's a live stream
          // OR has liveStreamingDetails (which means it was scheduled/streamed live)
          const isLiveStream = 
            snippet.liveBroadcastContent === 'live' || 
            snippet.liveBroadcastContent === 'upcoming' ||
            liveDetails !== undefined;

          if (!isLiveStream) {
            // Skip regular videos
            return null;
          }

          // Determine status
          let status: 'upcoming' | 'live' | 'completed' = 'completed';
          if (snippet.liveBroadcastContent === 'live') {
            status = 'live';
          } else if (snippet.liveBroadcastContent === 'upcoming') {
            status = 'upcoming';
          } else if (liveDetails) {
            // Has live streaming details
            if (liveDetails.actualEndTime) {
              status = 'completed';
            } else if (liveDetails.actualStartTime && !liveDetails.actualEndTime) {
              // Started but not ended - could be live or completed (check current time)
              const now = new Date();
              const endTime = liveDetails.actualEndTime ? new Date(liveDetails.actualEndTime) : null;
              if (!endTime) {
                // No end time yet - might still be live
                status = snippet.liveBroadcastContent === 'live' ? 'live' : 'completed';
              } else {
                status = 'completed';
              }
            } else if (liveDetails.scheduledStartTime && !liveDetails.actualStartTime) {
              status = 'upcoming';
            } else {
              // Has some live details but unclear status - mark as completed if it has end time
              status = liveDetails.actualEndTime ? 'completed' : 'completed';
            }
          }

          return {
            id: videoId,
            title: snippet.title,
            description: snippet.description,
            thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
            channelTitle: snippet.channelTitle,
            publishedAt: snippet.publishedAt,
            scheduledStartTime: liveDetails?.scheduledStartTime,
            actualStartTime: liveDetails?.actualStartTime,
            actualEndTime: liveDetails?.actualEndTime,
            viewCount: stats?.viewCount ? parseInt(stats.viewCount) : undefined,
            concurrentViewers: liveDetails?.concurrentViewers ? parseInt(liveDetails.concurrentViewers) : undefined,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            status,
          } as YouTubeLiveEvent;
        })
        .filter((event): event is YouTubeLiveEvent => event !== null);

      // Sort by status (live first, then upcoming, then completed) and by start time
      liveEvents.sort((a, b) => {
        const statusOrder = { live: 0, upcoming: 1, completed: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;

        const aTime = a.actualStartTime || a.scheduledStartTime || a.publishedAt;
        const bTime = b.actualStartTime || b.scheduledStartTime || b.publishedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      // Cache the results
      if (this.cacheService) {
        await this.cacheService.set(this.CACHE_KEY, liveEvents, this.CACHE_TTL);
      }

      this.logger.info(`Fetched ${liveEvents.length} live events from YouTube`);
      return liveEvents;
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
