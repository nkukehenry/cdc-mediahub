'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchYouTubeLiveEvents } from '@/store/youtubeSlice';
import { RootState } from '@/store';
import { Play, Calendar, Users, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function YouTubeLiveEvents() {
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

  const getStatusBadge = (status: string) => {
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
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading && liveEvents.length === 0) {
    return (
      <div className="bg-white p-6">
        <h2 className="text-2xl font-bold mb-4">YouTube Live Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse aspect-video" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6">
        <h2 className="text-2xl font-bold mb-4">YouTube Live Events</h2>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (liveEvents.length === 0) {
    return (
      <div className="bg-white p-6">
        <h2 className="text-2xl font-bold mb-4">YouTube Live Events</h2>
        <p className="text-gray-500">No live events available at this time.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6">
      <h2 className="text-2xl font-bold mb-6">YouTube Live Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {liveEvents.map((event) => (
          <div
            key={event.id}
            className="group relative bg-white overflow-hidden shadow-md hover:shadow-lg transition-all duration-300"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-gray-100">
              <img
                src={event.thumbnailUrl}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop';
                }}
              />
              
              {/* Status Badge Overlay */}
              <div className="absolute top-2 left-2">
                {getStatusBadge(event.status)}
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
                  href={event.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2"
                >
                  {event.title}
                  <ExternalLink className="w-4 h-4 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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

                {event.actualStartTime && (event.status === 'live' || event.status === 'completed') && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Started: {formatDate(event.actualStartTime)}</span>
                  </div>
                )}

                {event.actualEndTime && event.status === 'completed' && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Ended: {formatDate(event.actualEndTime)}</span>
                  </div>
                )}
              </div>

              {/* Channel */}
              <div className="mt-3 text-sm text-gray-500">
                {event.channelTitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
