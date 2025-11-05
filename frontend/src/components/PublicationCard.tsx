'use client';

import Link from 'next/link';
import { Music, Eye, MessageCircle, Camera, Video, FileText, Image } from 'lucide-react';
import { Publication } from '@/store/publicationsSlice';

interface PublicationCardProps {
  publication: Publication;
}

export default function PublicationCard({ publication }: PublicationCardProps) {
  const getCoverImageUrl = (coverImage?: string) => {
    if (!coverImage) return '/uploads/placeholder-image.jpg';
    if (coverImage.startsWith('http')) return coverImage;
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/${coverImage}`;
  };

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

  return (
    <Link
      href={`/publication/${publication.slug}`}
      className="group relative bg-white overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 aspect-[2/1] block"
      style={{ minHeight: '200px', height: '200px', width: '100%' }}
    >
      {/* Cover Image */}
      <div className="relative w-full h-full overflow-hidden">
        <img
          src={getCoverImageUrl(publication.coverImage)}
          alt={publication.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-image.jpg';
          }}
        />
        
        {/* Dark Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />

        {/* Category Tag */}
        <div className="absolute top-2 left-2 z-10 transform transition-transform duration-300 group-hover:scale-105">
          <span className="bg-au-corporate-green text-white px-2 py-1 rounded text-xs font-medium">
            {getCategoryName(publication)}
          </span>
        </div>

        {/* Category Icon Overlay - Centered */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <CategoryIcon className="h-12 w-12 text-white/80 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Content Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
            {publication.title}
          </h3>
          
          {/* Metadata */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">
                {publication.creator?.username || publication.creator?.firstName || 'Unknown'}
              </span>
              {publication.publicationDate && (
                <>
                  <span>•</span>
                  <span>{formatDate(publication.publicationDate)}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{publication.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>{publication.comments || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

