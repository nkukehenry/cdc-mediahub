'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import { store, RootState } from '@/store';
import { fetchYouTubeLiveEvents } from '@/store/youtubeSlice';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { Play, Calendar, Users, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { YouTubeLiveEvent } from '@/store/youtubeSlice';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';

function LiveEventsPageContent() {
  const dispatch = useDispatch();
  const { liveEvents, loading, error } = useSelector((state: RootState) => state.youtube);

  useEffect(() => {
    dispatch(fetchYouTubeLiveEvents() as any);
  }, [dispatch]);

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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
            LIVE
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Calendar className="w-3 h-3 mr-1" />
            Upcoming
          </span>
        );
      case 'recent_video':
        if (type === '') {
          return null;
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Recent
          </span>
        );
      default:
        return null;
    }
  };

  // Filter out videos with empty type
  const filteredEvents = liveEvents.filter(event => event.type !== '');

  // Group events by status
  const liveEventsList = filteredEvents.filter(e => e.status === 'live');
  const upcomingEvents = filteredEvents.filter(e => e.status === 'upcoming');
  const recentEvents = filteredEvents.filter(e => e.status === 'recent_video');

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      
      <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-au-corporate-green mb-2">
             Live Events
          </h1>
          <p className="text-au-grey-text/70">
            Watch live streams, upcoming events, and recent videos from our channel
          </p>
        </div>

        {/* Loading State */}
        {loading && filteredEvents.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg animate-pulse aspect-video" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <p>Failed to load events. Please try again later.</p>
          </div>
        )}

        {/* Live Events */}
        {!loading && liveEventsList.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-au-corporate-green mb-6">Live Now</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveEventsList.map((event) => (
                <EventCard key={event.id} event={event} formatDate={formatDate} getStatusBadge={getStatusBadge} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {!loading && upcomingEvents.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-au-corporate-green mb-6">Upcoming</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} formatDate={formatDate} getStatusBadge={getStatusBadge} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Videos */}
        {!loading && recentEvents.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-au-corporate-green mb-6">Recent Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentEvents.map((event) => (
                <EventCard key={event.id} event={event} formatDate={formatDate} getStatusBadge={getStatusBadge} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-au-grey-text/70 text-lg">No events available at this time.</p>
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}

function EventCard({ event, formatDate, getStatusBadge }: { 
  event: YouTubeLiveEvent; 
  formatDate: (date?: string) => string; 
  getStatusBadge: (status: string, type: string) => React.ReactElement | null;
}) {
  return (
    <div className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <img
          src={event.thumbnailUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
          }}
        />
        
        {/* Status Badge Overlay */}
        <div className="absolute top-2 left-2">
          {getStatusBadge(event.status, event.type)}
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Play className="w-12 h-12 text-white" fill="white" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      <Link
                        href={`/live-events/${event.id}`}
                        className="flex items-start gap-2"
                      >
                        {event.title}
                      </Link>
                    </h3>

        {/* Metadata */}
        <div className="space-y-2 text-sm text-gray-600">
          {event.status === 'live' && event.concurrentViewers !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{event.concurrentViewers.toLocaleString()} watching</span>
            </div>
          )}

          {event.viewCount !== undefined && event.status !== 'live' && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{event.viewCount.toLocaleString()} views</span>
            </div>
          )}

          {event.scheduledStartTime && event.status === 'upcoming' && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Scheduled: {formatDate(event.scheduledStartTime)}</span>
            </div>
          )}

          {event.actualStartTime && (event.status === 'live' || event.status === 'recent_video') && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Started: {formatDate(event.actualStartTime)}</span>
            </div>
          )}

          {event.actualEndTime && event.status === 'recent_video' && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Ended: {formatDate(event.actualEndTime)}</span>
            </div>
          )}

          {event.publishedAt && event.status === 'recent_video' && !event.actualStartTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Published: {formatDate(event.publishedAt)}</span>
            </div>
          )}
        </div>

        {/* Channel */}
        <div className="mt-3 text-sm text-gray-500">
          {event.channelTitle}
        </div>
      </div>
    </div>
  );
}

export default function LiveEventsPage() {
  return (
    <Provider store={store}>
      <LiveEventsPageContent />
    </Provider>
  );
}

