'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import { store, RootState } from '@/store';
import { fetchYouTubeLiveEvents } from '@/store/youtubeSlice';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { ArrowLeft, Play, Calendar, Users, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { YouTubeLiveEvent } from '@/store/youtubeSlice';

function LiveEventDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { liveEvents, loading } = useSelector((state: RootState) => state.youtube);
  const [event, setEvent] = useState<YouTubeLiveEvent | null>(null);

  const videoId = params?.videoId as string;

  useEffect(() => {
    // Fetch events if not already loaded
    if (liveEvents.length === 0) {
      dispatch(fetchYouTubeLiveEvents() as any);
    }
  }, [dispatch, liveEvents.length]);

  useEffect(() => {
    // Find the event by video ID
    if (liveEvents.length > 0 && videoId) {
      const foundEvent = liveEvents.find(e => e.id === videoId);
      setEvent(foundEvent || null);
    }
  }, [liveEvents, videoId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string, type: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
            LIVE
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Calendar className="w-4 h-4 mr-1" />
            Upcoming
          </span>
        );
      case 'recent_video':
        if (type === '') {
          return null;
        }
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Recent
          </span>
        );
      default:
        return null;
    }
  };

  if (loading && !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="aspect-video bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-12">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-au-grey-text mb-4">Event Not Found</h1>
            <p className="text-au-grey-text/70 mb-6">The YouTube event you're looking for does not exist.</p>
            <Link
              href="/live-events"
              className="inline-flex items-center gap-2 px-6 py-3 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Live Events
            </Link>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      
      <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-8 md:py-12">
        {/* Back Button */}
        <Link
          href="/live-events"
          className="inline-flex items-center gap-2 text-au-grey-text hover:text-au-corporate-green transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Live Events</span>
        </Link>

        {/* Video Player */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${event.id}${event.status === 'live' ? '?autoplay=1' : ''}`}
              title={event.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Video Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getStatusBadge(event.status, event.type)}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-au-grey-text mb-2">
                {event.title}
              </h1>
            </div>
            <a
              href={event.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Watch on YouTube</span>
            </a>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-3">
              {event.status === 'live' && event.concurrentViewers !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-5 h-5 text-au-corporate-green" />
                  <span className="text-au-grey-text font-medium">
                    {event.concurrentViewers.toLocaleString()} watching now
                  </span>
                </div>
              )}

              {event.viewCount !== undefined && event.status !== 'live' && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-5 h-5 text-au-corporate-green" />
                  <span className="text-au-grey-text font-medium">
                    {event.viewCount.toLocaleString()} views
                  </span>
                </div>
              )}

              {event.scheduledStartTime && event.status === 'upcoming' && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-5 h-5 text-au-corporate-green" />
                  <span className="text-au-grey-text">
                    Scheduled: {formatDate(event.scheduledStartTime)}
                  </span>
                </div>
              )}

              {event.actualStartTime && (event.status === 'live' || event.status === 'recent_video') && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-5 h-5 text-au-corporate-green" />
                  <span className="text-au-grey-text">
                    Started: {formatDate(event.actualStartTime)}
                  </span>
                </div>
              )}

              {event.actualEndTime && event.status === 'recent_video' && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-5 h-5 text-au-corporate-green" />
                  <span className="text-au-grey-text">
                    Ended: {formatDate(event.actualEndTime)}
                  </span>
                </div>
              )}

              {event.publishedAt && event.status === 'recent_video' && !event.actualStartTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-5 h-5 text-au-corporate-green" />
                  <span className="text-au-grey-text">
                    Published: {formatDate(event.publishedAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="text-sm">
              <div className="text-au-grey-text/70 mb-1">Channel</div>
              <div className="text-au-grey-text font-medium">{event.channelTitle}</div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-au-grey-text mb-3">Description</h2>
              <div 
                className="text-au-grey-text whitespace-pre-wrap prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: event.description.replace(/\n/g, '<br />') }}
              />
            </div>
          )}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

export default function LiveEventDetailPage() {
  return (
    <Provider store={store}>
      <LiveEventDetailPageContent />
    </Provider>
  );
}

