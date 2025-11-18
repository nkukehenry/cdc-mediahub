'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Music, Eye, MessageCircle, Camera, Video, FileText, Image, Calendar, User } from 'lucide-react';
import { Publication } from '@/store/publicationsSlice';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH, truncateText, formatFileSize } from '@/utils/fileUtils';
import { isAudioPublication } from '@/utils/publicationUtils';

interface PublicationCardProps {
  publication: Publication;
  variant?: 'default' | 'small' | 'medium' | 'large';
  onVariantDetected?: (variant: 'small' | 'medium' | 'large' | 'default') => void;
}

const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

const generateWaveformBars = (seed: string, length = 60) => {
  const baseSeed = seed
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

  return Array.from({ length }, (_, i) => {
    const pseudoRandom = Math.sin(baseSeed + i * 0.35) * 0.5 + 0.5;
    return Math.max(25, Math.min(90, pseudoRandom * 60 + 25));
  });
};

const getMediaDetails = (publication: Publication) => {
    // Check if publication is in a video category
    const categoryName = publication.category?.name?.toLowerCase() || '';
    const categorySlug = publication.category?.slug?.toLowerCase() || '';
    const isVideoCategory = categoryName.includes('video') || categorySlug.includes('video');
    const audioPublication = isAudioPublication(publication);
    const firstAudioAttachment = publication.attachments?.find(att => att.mimeType?.startsWith('audio/'));
    const hasAudioAttachment = Boolean(firstAudioAttachment);

    // If it's an audio publication, always use audio card style (even if it has coverImage)
    if (audioPublication || hasAudioAttachment) {
      const coverImageUrl = publication.coverImage ? getImageUrl(publication.coverImage) : undefined;
      const audioThumbnailUrl = (firstAudioAttachment as any)?.thumbnailUrl;
      const audioThumbnailPath = (firstAudioAttachment as any)?.thumbnailPath;
      const audioAttachmentImage =
        audioThumbnailUrl ||
        (audioThumbnailPath ? getImageUrl(audioThumbnailPath) : undefined) ||
        (firstAudioAttachment?.filePath ? getImageUrl(firstAudioAttachment.filePath) : undefined);
      const backgroundUrl = coverImageUrl || audioAttachmentImage;

      return {
        isVideo: false,
        isVideoCategory,
        isYouTube: false,
        youtubeVideoId: null,
        isAudio: true,
        audioAttachment: firstAudioAttachment,
        url: getImageUrl(PLACEHOLDER_IMAGE_PATH),
        mimeType: firstAudioAttachment?.mimeType,
        attachment: firstAudioAttachment,
        backgroundUrl: backgroundUrl || getImageUrl(PLACEHOLDER_IMAGE_PATH),
      };
    }

    // Check for video content (YouTube URL or video attachments)
    const hasYouTubeUrl = Boolean(publication.youtubeUrl);
    const youtubeVideoId = publication.youtubeUrl ? extractYouTubeVideoId(publication.youtubeUrl) : null;
    const hasVideoAttachment = publication.attachments?.some(att => att.mimeType?.startsWith('video/')) || false;
    const hasVideoContent = hasYouTubeUrl || hasVideoAttachment;

    // Prioritize coverImage (including captured thumbnails) over everything else
    const coverImage = publication.coverImage;
    if (coverImage) {
      const lower = coverImage.toLowerCase();
      const isCoverImageVideo =
        lower.includes('.mp4') ||
        lower.includes('.mov') ||
        lower.includes('.webm') ||
        lower.includes('.mpe') ||
        lower.includes('.mpeg') ||
        lower.includes('.avi') ||
        lower.includes('.wmv') ||
        lower.includes('.ogv') ||
        lower.includes('.ogg');

      // If coverImage exists, always use it (this includes captured thumbnails from videos)
      // But mark as video if it's a video file OR if the publication has video content (YouTube/video attachments)
      const isVideo = isCoverImageVideo || hasVideoContent;
      // For play button: show if in video category OR has video content
      const shouldShowPlayButton = isVideoCategory || hasVideoContent;

      return {
        isVideo,
        isVideoCategory: shouldShowPlayButton, // True if in video category OR has video content
        isYouTube: Boolean(youtubeVideoId),
        youtubeVideoId: youtubeVideoId,
        isAudio: false,
        audioAttachment: undefined,
        url: getImageUrl(coverImage),
        backgroundUrl: getImageUrl(coverImage),
        mimeType: publication.attachments?.[0]?.mimeType,
        attachment: undefined,
      };
    }

    // Fall back to YouTube URL if no coverImage exists
    if (publication.youtubeUrl && youtubeVideoId) {
      return {
        isVideo: true,
        isVideoCategory: isVideoCategory || true, // YouTube is always a video
        isYouTube: true,
        youtubeVideoId: youtubeVideoId,
        isAudio: false,
        audioAttachment: undefined,
        url: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
        backgroundUrl: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
        mimeType: undefined,
        attachment: undefined,
      };
    }

    const firstAttachment = publication.attachments?.[0];
    if (firstAttachment && firstAttachment.mimeType?.startsWith('video/')) {
      // For video attachments, prefer thumbnail if available, otherwise use downloadUrl or filePath
      const thumbnailUrl = (firstAttachment as any).thumbnailUrl;
      const thumbnailPath = (firstAttachment as any).thumbnailPath;
      const attachmentUrl =
        thumbnailUrl ||
        (thumbnailPath ? getImageUrl(thumbnailPath) : undefined) ||
        firstAttachment.downloadUrl ||
        (firstAttachment.filePath ? getImageUrl(firstAttachment.filePath) : undefined) ||
        getImageUrl(PLACEHOLDER_IMAGE_PATH);
      return {
        isVideo: true,
        isVideoCategory: isVideoCategory || true, // Video attachments are always videos
        isYouTube: false,
        youtubeVideoId: null,
        isAudio: false,
        audioAttachment: undefined,
        url: attachmentUrl,
        backgroundUrl: attachmentUrl,
        mimeType: firstAttachment.mimeType,
        attachment: firstAttachment,
      };
    }

    return {
      isVideo: false,
      isVideoCategory,
      isYouTube: false,
      youtubeVideoId: null,
      isAudio: false,
      audioAttachment: undefined,
      url: getImageUrl(PLACEHOLDER_IMAGE_PATH),
      backgroundUrl: getImageUrl(PLACEHOLDER_IMAGE_PATH),
      mimeType: undefined,
      attachment: undefined,
    };
  };

export default function PublicationCard({ publication, variant: propVariant, onVariantDetected }: PublicationCardProps) {
  const mediaDetails = getMediaDetails(publication);
  const isAudioCard = Boolean(mediaDetails.isAudio);
  const audioWaveformBars = useMemo(
    () => (isAudioCard ? generateWaveformBars(publication.id) : []),
    [isAudioCard, publication.id]
  );

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

  if (isAudioCard) {
    // Audio cards use row-span-3 (150px) to fit compactly in collage grid
    return (
      <Link
        href={`/publication/${publication.slug}`}
        className="group relative block w-full h-[150px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
      >
        {/* Background Image - No blur */}
        {mediaDetails.backgroundUrl && (
          <div className="absolute inset-0">
            <img
              src={mediaDetails.backgroundUrl}
              alt={publication.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
              }}
            />
          </div>
        )}

        {/* Play Button - Always visible */}
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-au-corporate-green/90 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
            <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col p-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-au-corporate-green shadow-sm">
                <Music className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white drop-shadow-md line-clamp-1 truncate">
                {publication.title || 'Untitled Publication'}
              </h3>
            </div>
            {typeof mediaDetails.audioAttachment?.size === 'number' && Number.isFinite(mediaDetails.audioAttachment.size) && (
              <span className="text-[10px] font-medium text-white/90 drop-shadow-md shrink-0 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
                {formatFileSize(mediaDetails.audioAttachment.size)}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex h-8 items-end gap-0.5 mb-1.5">
              {audioWaveformBars.map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-sm bg-gradient-to-t from-au-corporate-green to-au-corporate-green/60 shadow-sm"
                  style={{
                    height: `${height}%`,
                    minWidth: '2px',
                    opacity: index % 5 === 0 ? 0.95 : 0.7,
                  }}
                />
              ))}
            </div>
            {(() => {
              const audioDuration = (mediaDetails.audioAttachment as any)?.duration;
              return (
                <div className="flex items-center gap-1.5 text-[10px] text-white/90 drop-shadow-md">
              <Music className="h-2.5 w-2.5" />
              <span>{mediaDetails.audioAttachment?.mimeType?.split('/')[1]?.toUpperCase() || 'AUDIO'}</span>
                  {typeof audioDuration === 'number' && Number.isFinite(audioDuration) && (
                    <>
                      <span>•</span>
                      <span>{Math.round(audioDuration)}s</span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex items-center justify-between mt-auto pt-1.5 text-[10px] text-white/90 drop-shadow-md">
            {publication.publicationDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                <span className="truncate">{formatDate(publication.publicationDate)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Eye className="h-2.5 w-2.5" />
                <span>{publication.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-2.5 w-2.5" />
                <span>{publication.commentsCount ?? publication.comments ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hover Overlay - Shows title, author, date with blur */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/80 to-black/40 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-sm">
          <div className="space-y-2 transform translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
            {/* Title */}
            <h3 className="text-base font-bold text-white line-clamp-2 drop-shadow-lg opacity-0 transform translate-y-2 transition-all duration-300 delay-75 group-hover:opacity-100 group-hover:translate-y-0">
              {publication.title || 'Untitled Publication'}
            </h3>

            {/* Author */}
            <div className="flex items-center gap-2 text-xs text-white/90 opacity-0 transform translate-y-2 transition-all duration-300 delay-100 group-hover:opacity-100 group-hover:translate-y-0">
              <User className="h-3 w-3" />
              <span className="font-medium">{formatAuthorName()}</span>
            </div>

            {/* Date */}
            {publication.publicationDate && (
              <div className="flex items-center gap-2 text-xs text-white/90 opacity-0 transform translate-y-2 transition-all duration-300 delay-150 group-hover:opacity-100 group-hover:translate-y-0">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(publication.publicationDate)}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  const cardHeightClass = variantConfig.height;
  const cardBackgroundClass = 'bg-gray-100 hover:shadow-2xl';

  // Add smooth transition when variant changes
  return (
    <Link
      href={`/publication/${publication.slug}`}
      className={`group relative block w-full ${cardHeightClass} overflow-hidden rounded-lg transition-all duration-500 ${cardBackgroundClass}`}
      style={{
        // Smooth height transition when variant changes
        transitionProperty: 'height, box-shadow',
      }}
    >
      <div className="absolute inset-0">
        {mediaDetails.isYouTube && mediaDetails.youtubeVideoId ? (
          <img
            src={mediaDetails.url}
            alt={publication.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
            }}
          />
        ) : mediaDetails.isVideo && mediaDetails.isVideoCategory ? (
          <img
            src={mediaDetails.url}
            alt={publication.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
            }}
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-0" />

      {/* Play Button Overlay - Always visible above all overlays */}
      {(mediaDetails.isYouTube && mediaDetails.youtubeVideoId) || (mediaDetails.isVideo && mediaDetails.isVideoCategory) ? (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`w-16 h-16 rounded-full ${mediaDetails.isYouTube ? 'bg-red-600/90' : 'bg-au-corporate-green/90'} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}>
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      ) : null}

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
      <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/80 to-black/40 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
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

