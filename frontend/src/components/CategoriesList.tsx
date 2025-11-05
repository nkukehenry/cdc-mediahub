'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { RootState } from '@/store';
import { fetchLatestPublications } from '@/store/publicationsSlice';
import type { Publication } from '@/store/publicationsSlice';

interface CategoriesListProps {
  limit?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getCoverImageUrl = (coverImage?: string) => {
  if (!coverImage) return 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop';
  if (coverImage.startsWith('http')) return coverImage;
  return `${API_BASE_URL}/${coverImage}`;
};

const getTimeAgo = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
};

const getInitials = (publication: Publication) => {
  const creator = publication.creator;
  if (!creator) return 'A';
  
  if (creator.username) {
    return creator.username.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (creator.firstName || creator.lastName) {
    return `${creator.firstName?.[0] || ''}${creator.lastName?.[0] || ''}`.toUpperCase();
  }
  if (creator.email) {
    return creator.email[0].toUpperCase();
  }
  return 'A';
};

export default function CategoriesList({ limit = 5 }: CategoriesListProps) {
  const dispatch = useDispatch();
  const { latestPublications, loading } = useSelector((state: RootState) => state.publications);

  useEffect(() => {
    dispatch(fetchLatestPublications(limit) as any);
  }, [dispatch, limit]);

  if (loading) {
    return (
      <div className="w-full space-y-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="bg-white p-4 flex gap-4 animate-pulse">
            <div className="w-20 h-20 bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 w-3/4" />
              <div className="h-3 bg-gray-200 w-1/4" />
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (latestPublications.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {latestPublications.slice(0, limit).map((publication) => (
        <Link
          key={publication.id}
          href={`/publications/${publication.slug}`}
          className="block bg-white p-4 hover:shadow-md transition-shadow flex gap-4 group"
        >
          {/* Thumbnail - Square on Left */}
          <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-gray-100">
            <img
              src={getCoverImageUrl(publication.coverImage)}
              alt={publication.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop';
              }}
            />
          </div>

          {/* Content - Title and Time */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <h3 className="text-gray-900 font-semibold text-sm line-clamp-2 group-hover:text-au-corporate-green transition-colors">
              {publication.title}
            </h3>
            <p className="text-gray-500 text-xs mt-1">
              {getTimeAgo(publication.publicationDate || publication.createdAt)}
            </p>
          </div>

          {/* Author Avatar - Circular on Right */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-au-corporate-green flex items-center justify-center text-white text-xs font-semibold">
              {getInitials(publication)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
