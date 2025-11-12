'use client';

import Link from 'next/link';
import { Music, Eye, MessageCircle, Camera, Video, FileText, Image, Calendar, User } from 'lucide-react';
import { Publication } from '@/store/publicationsSlice';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH, truncateText } from '@/utils/fileUtils';

interface PublicationCardProps {
  publication: Publication;
  variant?: 'default' | 'small' | 'medium' | 'large';
  onVariantDetected?: (variant: 'small' | 'medium' | 'large' | 'default') => void;
}

const getMediaDetails = (publication: Publication) => {
    const coverImage = publication.coverImage;
    if (coverImage) {
      const lower = coverImage.toLowerCase();
      const isVideo =
        lower.includes('.mp4') ||
        lower.includes('.mov') ||
        lower.includes('.webm') ||
        lower.includes('.mpe') ||
        lower.includes('.mpeg') ||
        lower.includes('.avi') ||
        lower.includes('.wmv') ||
        lower.includes('.ogv') ||
        lower.includes('.ogg');

      return {
        isVideo,
        url: getImageUrl(coverImage),
        mimeType: publication.attachments?.[0]?.mimeType,
        attachment: undefined,
      };
    }

    const firstAttachment = publication.attachments?.[0];
    if (firstAttachment && firstAttachment.mimeType?.startsWith('video/')) {
      const attachmentUrl =
        firstAttachment.downloadUrl ||
        (firstAttachment.filePath ? getImageUrl(firstAttachment.filePath) : undefined);
      return {
        isVideo: true,
        url: attachmentUrl || '',
        mimeType: firstAttachment.mimeType,
        attachment: firstAttachment,
      };
    }

    return {
      isVideo: false,
      url: getImageUrl(PLACEHOLDER_IMAGE_PATH),
      mimeType: undefined,
      attachment: undefined,
    };
  };

export default function PublicationCard({ publication, variant: propVariant, onVariantDetected }: PublicationCardProps) {
  const mediaDetails = getMediaDetails(publication);
  
  // Use prop variant if provided, otherwise default to 'medium'
  const variant = propVariant || 'medium';

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

  // Variant-based height and row span for collage layout
  // Base row size: 50px
  // Small: 250px = 5 rows (250 / 50 = 5)
  // Medium: 300px = 6 rows (300 / 50 = 6)
  // Large: 500px = 10 rows (500 / 50 = 10)
  // Default: 280px = 6 rows (280 / 50 = 5.6, rounded to 6)
  const getVariantConfig = () => {
    switch (variant) {
      case 'small':
        return { height: 'h-[250px]', rowSpan: 'row-span-5' };
      case 'medium':
        return { height: 'h-[300px]', rowSpan: 'row-span-6' };
      case 'large':
        return { height: 'h-[500px]', rowSpan: 'row-span-10' };
      default:
        return { height: 'h-[300px]', rowSpan: 'row-span-6' };
    }
  };

  const variantConfig = getVariantConfig();

  // Add smooth transition when variant changes
  return (
    <Link
      href={`/publication/${publication.slug}`}
      className={`group relative block w-full ${variantConfig.height} overflow-hidden rounded-lg bg-gray-100 transition-all duration-500 hover:shadow-2xl`}
      style={{
        // Smooth height transition when variant changes
        transitionProperty: 'height, box-shadow',
      }}
    >
      {/* Full-bleed Image/Video */}
      <div className="absolute inset-0">
        {mediaDetails.isVideo && mediaDetails.url ? (
          <video
            src={mediaDetails.url}
            className="h-full w-full object-cover"
            muted
            playsInline
            loop
            preload="metadata"
          />
        ) : (
          <img
            src={mediaDetails.url || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
            alt={publication.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
            }}
          />
        )}
      </div>

      {/* Gradient Overlay - Always visible but subtle */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Category Badge - Top Left */}
      <div className="absolute left-3 top-3 z-20">
        <span className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white shadow-lg transition-all duration-300 group-hover:bg-au-corporate-green group-hover:shadow-xl">
          {getCategoryName(publication)}
        </span>
      </div>

      {/* Category Icon - Top Right */}
      <div className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-all duration-300 group-hover:bg-au-corporate-green">
        <CategoryIcon className="h-4 w-4 text-white" />
      </div>

      {/* Hover Overlay - Shows metadata on hover */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/80 to-black/40 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="space-y-3 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
          {/* Title */}
          <h3 className="text-xl font-bold text-white line-clamp-2 drop-shadow-lg opacity-0 transform translate-y-2 transition-all duration-300 delay-75 group-hover:opacity-100 group-hover:translate-y-0">
            {publication.title || 'Untitled Publication'}
          </h3>

          {/* Description */}
          {publication.description && (
            <p className="text-sm text-white/90 line-clamp-3 drop-shadow-md opacity-0 transform translate-y-2 transition-all duration-300 delay-100 group-hover:opacity-100 group-hover:translate-y-0">
              {truncateText(publication.description, 120)}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/20 opacity-0 transform translate-y-2 transition-all duration-300 delay-150 group-hover:opacity-100 group-hover:translate-y-0">
            {/* Author 
            <div className="flex items-center gap-2 text-sm text-white/90">
              <User className="h-4 w-4" />
              <span className="font-medium">{formatAuthorName()}</span>
            </div>*/}

            {/* Date */}
            {publication.publicationDate && (
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(publication.publicationDate)}</span>
              </div>
            )}

            {/* Views */}
            <div className="flex items-center gap-2 text-sm text-white/90">
              <Eye className="h-4 w-4" />
              <span>{publication.views || 0}</span>
            </div>

            {/* Comments */}
            <div className="flex items-center gap-2 text-sm text-white/90">
              <MessageCircle className="h-4 w-4" />
              <span>{publication.commentsCount ?? publication.comments ?? 0}</span>
            </div>
          </div>

          {/* Category 
          <div className="flex flex-wrap gap-2 opacity-0 transform translate-y-2 transition-all duration-300 delay-200 group-hover:opacity-100 group-hover:translate-y-0">
            {publication.category && (
              <span className="rounded-full bg-au-corporate-green/90 px-3 py-1 text-xs font-medium text-white">
                {publication.category.name}
              </span>
            )}
            {publication.subcategories && publication.subcategories.length > 0 && (
              publication.subcategories.slice(0, 2).map((subcat) => (
                <span
                  key={subcat.id}
                  className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white"
                >
                  {subcat.name}
                </span>
              ))
            )}
          </div>*/}
        </div>
      </div>
    </Link>
  );
}

