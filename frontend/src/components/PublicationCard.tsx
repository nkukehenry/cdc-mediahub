'use client';

import Link from 'next/link';
import { Music, Eye, MessageCircle, Camera, Video, FileText, Image } from 'lucide-react';
import { Publication } from '@/store/publicationsSlice';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH, truncateText } from '@/utils/fileUtils';

interface PublicationCardProps {
  publication: Publication;
}

export default function PublicationCard({ publication }: PublicationCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const getCategoryName = (publication: Publication) => {
    if (publication.category?.name) return publication.category.name;
    // Fallback to subcategory or default
    if (publication.subcategories && publication.subcategories.length > 0) {
      return publication.subcategories[0].name;
    }
    return 'Uncategorized';
  };

  const getCategoryIcon = (publication: Publication) => {
    const categoryName = getCategoryName(publication).toLowerCase();
    
    if (categoryName.includes('video')) return Video;
    if (categoryName.includes('photo') || categoryName.includes('image') || categoryName.includes('picture')) return Camera;
    if (categoryName.includes('document') || categoryName.includes('pdf') || categoryName.includes('file')) return FileText;
    if (categoryName.includes('audio') || categoryName.includes('sound') || categoryName.includes('music')) return Music;
    if (categoryName.includes('infographic') || categoryName.includes('graphic')) return Image;
    
    // Default to Music icon for backward compatibility
    return Music;
  };

  const CategoryIcon = getCategoryIcon(publication);

  const formatAuthorName = () => {
    const creator = publication.creator;

    if (!creator) {
      return 'Anonymous';
    }

    const first = creator.firstName?.trim();
    const last = creator.lastName?.trim();

    let composed = '';

    if (first || last) {
      const lastSegment = last ? truncateText(last.toUpperCase(), 6) : '';
      composed = [first, lastSegment].filter(Boolean).join(' ');
    } else if (creator.username) {
      composed = creator.username.trim();
    }

    if (!composed) {
      composed = 'Anonymous';
    }

    return truncateText(composed, 25);
  };

  return (
    <Link
      href={`/publication/${publication.slug}`}
      className="group block h-full overflow-hidden border border-gray-200 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg"
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
        <img
          src={getImageUrl(publication.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
          alt={publication.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
          }}
        />
        
        {/* Translucent Overlay */}
        <div className="absolute inset-0" />

        {/* Category Tag */}
        <div className="absolute left-3 top-3 z-20">
          <span className="rounded-full bg-au-green px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors duration-300 group-hover:bg-au-gold">
            {getCategoryName(publication)}
          </span>
        </div>

        {/* Category Icon */}
        <div className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
          <CategoryIcon className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-lg font-semibold text-gray-500 transition-colors duration-300 group-hover:text-au-green">
          {truncateText(publication.title, 32) || 'Untitled Publication'}
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">{formatAuthorName()}</span>
            {publication.publicationDate && (
              <>
                <span className="text-gray-300">•</span>
                <span>{formatDate(publication.publicationDate)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{publication.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{publication.commentsCount ?? publication.comments ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

