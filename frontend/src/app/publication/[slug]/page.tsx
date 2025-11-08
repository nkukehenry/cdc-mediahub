'use client';

import { useEffect, useState, useRef, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Eye, MessageCircle, Heart, Share2, Download, FileText, Image as ImageIcon, Video, Music, Eye as EyeIcon } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from '@/store';
import { fetchPublicationBySlug, fetchRelatedPublications } from '@/store/publicationsSlice';
import FilePreviewModal from '@/components/FilePreviewModal';
import { FileWithUrls } from '@/types/fileManager';
import PublicationsCarousel from '@/components/PublicationsCarousel';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { apiClient } from '@/utils/apiClient';

const COMMENTS_PAGE_SIZE = 10;

interface PostComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  userId?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  author?: {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

function PublicationDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const slug = params?.slug as string;
  const { currentPublication, loading, error, relatedPublications } = useSelector((state: RootState) => state.publications);
  const [previewFile, setPreviewFile] = useState<FileWithUrls | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const mediaBlobUrlRef = useRef<string | null>(null);
  const { user } = useAuth();
  const { handleError, showWarning, showSuccess } = useErrorHandler();

  const [likesCount, setLikesCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeLoading, setLikeLoading] = useState<boolean>(false);

  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState<boolean>(false);
  const [commentsPagination, setCommentsPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
    limit: COMMENTS_PAGE_SIZE,
    offset: 0,
  });
  const [commentContent, setCommentContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (slug) {
      dispatch(fetchPublicationBySlug(slug) as any);
    }
  }, [slug, dispatch]);

  useEffect(() => {
    if (currentPublication && currentPublication.categoryId) {
      dispatch(fetchRelatedPublications({
        categoryId: currentPublication.categoryId,
        excludeId: currentPublication.id,
        limit: 8
      }) as any);
    }
  }, [currentPublication, dispatch]);

  const publication = currentPublication;
  const publicationId = publication?.id;

  const loadComments = useCallback(async (page = 1, replace = false) => {
    if (!publicationId) {
      return;
    }

    const safePage = Math.max(1, page);
    const limit = COMMENTS_PAGE_SIZE;
    const offset = (safePage - 1) * limit;
    const isInitial = replace || safePage === 1;

    if (isInitial) {
      setCommentsLoading(true);
    } else {
      setCommentsLoadingMore(true);
    }

    try {
      const response = await apiClient.getPostComments(publicationId, {
        limit,
        offset,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load comments');
      }

      const fetchedComments: PostComment[] = response.data.comments ?? [];
      setComments((prev) => {
        if (isInitial) {
          return fetchedComments;
        }
        const existingIds = new Set(prev.map((comment) => comment.id));
        const filtered = fetchedComments.filter((comment) => !existingIds.has(comment.id));
        return [...prev, ...filtered];
      });

      const pagination = response.data.pagination;
      if (pagination) {
        setCommentsPagination({
          total: pagination.total ?? fetchedComments.length,
          page: pagination.page ?? safePage,
          totalPages: pagination.totalPages ?? Math.max(1, Math.ceil((pagination.total ?? fetchedComments.length) / (pagination.limit ?? limit))),
          limit: pagination.limit ?? limit,
          offset: pagination.offset ?? offset,
        });

        if (typeof pagination.total === 'number') {
          setCommentsCount(pagination.total);
        } else {
          setCommentsCount((prev) => (isInitial ? fetchedComments.length : prev + fetchedComments.length));
        }
      } else {
        setCommentsPagination((prev) => {
          const newTotal = isInitial ? fetchedComments.length : prev.total + fetchedComments.length;
          return {
            total: newTotal,
            page: safePage,
            totalPages: Math.max(1, Math.ceil(newTotal / limit)),
            limit,
            offset,
          };
        });
        setCommentsCount((prev) => (isInitial ? fetchedComments.length : prev + fetchedComments.length));
      }
    } catch (err) {
      handleError(err, 'Failed to load comments');
    } finally {
      if (isInitial) {
        setCommentsLoading(false);
      } else {
        setCommentsLoadingMore(false);
      }
    }
  }, [publicationId, handleError]);

  useEffect(() => {
     if (!publicationId || !publication) {
       return;
     }
 
     setLikesCount(publication.likesCount ?? publication.likes ?? 0);
     setIsLiked(Boolean(publication.isLiked));
     setCommentsCount(publication.commentsCount ?? publication.comments ?? 0);
     setComments([]);
     setCommentsPagination({
       total: 0,
       page: 1,
       totalPages: 1,
       limit: COMMENTS_PAGE_SIZE,
       offset: 0,
     });
     setCommentContent('');
     setGuestName('');
     setGuestEmail('');
 
     loadComments(1, true);
  }, [
    publicationId,
    publication?.likesCount,
    publication?.commentsCount,
    publication?.likes,
    publication?.comments,
    publication?.isLiked,
    loadComments,
  ]);

  // Load first attachment as blob for preview (similar to FilePreviewModal)
  useEffect(() => {
    if (!publication?.attachments || publication.attachments.length === 0) {
      // Clean up if no attachments
      if (mediaBlobUrlRef.current) {
        URL.revokeObjectURL(mediaBlobUrlRef.current);
        mediaBlobUrlRef.current = null;
      }
      setMediaBlobUrl(null);
      return;
    }

    // Get first attachment for preview
    const firstAttachment = publication.attachments[0];
    if (!firstAttachment) {
      return;
    }

    const fetchMediaFile = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        
        // Build headers with auth token if available
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${baseUrl}/api/files/${firstAttachment.id}/download`, {
          headers
        });

        if (!response.ok) {
          console.error('Failed to load attachment file:', response.statusText);
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Clean up previous blob URL
        if (mediaBlobUrlRef.current) {
          URL.revokeObjectURL(mediaBlobUrlRef.current);
        }
        
        mediaBlobUrlRef.current = url;
        setMediaBlobUrl(url);
      } catch (err) {
        console.error('Failed to fetch attachment file for preview:', err);
      }
    };

    fetchMediaFile();

    // Cleanup blob URL on unmount or when publication changes
    return () => {
      if (mediaBlobUrlRef.current) {
        URL.revokeObjectURL(mediaBlobUrlRef.current);
        mediaBlobUrlRef.current = null;
      }
      setMediaBlobUrl(null);
    };
  }, [publication?.id, publication?.attachments]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  const handleToggleLike = async () => {
    if (!publication) {
      return;
    }

    if (!user) {
      showWarning('Please sign in to like this publication.');
      if (typeof window !== 'undefined') {
        const redirectUrl = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      } else {
        router.push('/login');
      }
      return;
    }

    if (likeLoading) {
      return;
    }

    setLikeLoading(true);
    try {
      const response = isLiked
        ? await apiClient.unlikePost(publication.id)
        : await apiClient.likePost(publication.id);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update like status');
      }

      setIsLiked(response.data.liked);
      setLikesCount(response.data.likes ?? 0);
    } catch (err) {
      handleError(err, 'Failed to update like status');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
     event.preventDefault();
 
    if (!publication) {
      return;
    }
 
    const trimmedContent = commentContent.trim();
    if (!trimmedContent) {
      showWarning('Please enter a comment.');
      return;
    }
 
    let finalAuthorName: string | undefined;
    let finalAuthorEmail: string | undefined;

    if (user) {
      finalAuthorName = undefined;
      finalAuthorEmail = undefined;
    } else {
      const trimmedName = guestName.trim();
      const trimmedEmail = guestEmail.trim();
      if (!trimmedName) {
        showWarning('Please enter your name.');
        return;
      }
      if (!trimmedEmail) {
        showWarning('Please enter your email.');
        return;
      }
      finalAuthorName = trimmedName;
      finalAuthorEmail = trimmedEmail;
    }
 
    setCommentSubmitting(true);
    try {
      const response = await apiClient.addPostComment(publication.id, {
        content: trimmedContent,
        authorName: finalAuthorName,
        authorEmail: finalAuthorEmail,
      });
 
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to add comment');
      }
 
      showSuccess('Comment added successfully.');
      setCommentContent('');
      if (!user) {
        setGuestName('');
        setGuestEmail('');
      }
      setCommentsCount((prev) => response.data.commentsCount ?? prev + 1);
      await loadComments(1, true);
    } catch (err) {
      handleError(err, 'Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleLoadMoreComments = async () => {
    const hasMore = commentsPagination.page < commentsPagination.totalPages;
    if (commentsLoading || commentsLoadingMore || !hasMore) {
      return;
    }
    await loadComments(commentsPagination.page + 1);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    return FileText;
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const blob = await apiClient.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  };

  const handlePreview = (attachment: any) => {
    // Convert attachment to FileWithUrls format for preview modal
    const fileWithUrls: FileWithUrls = {
      id: attachment.id,
      filename: attachment.originalName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileSize: attachment.size,
      filePath: attachment.filePath,
      downloadUrl: attachment.downloadUrl || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/files/${attachment.id}/download`,
      thumbnailUrl: attachment.mimeType?.startsWith('image/') ? attachment.downloadUrl || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/files/${attachment.id}/download` : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folderId: undefined,
    };
    setPreviewFile(fileWithUrls);
    setIsPreviewOpen(true);
  };

  const handleShare = () => {
    if (typeof window === 'undefined' || !currentPublication) return;
    
    setShowShareMenu(!showShareMenu);
  };

  const shareToSocial = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp') => {
    if (typeof window === 'undefined' || !currentPublication) return;
    
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(currentPublication.title);
    const text = encodeURIComponent(currentPublication.metaDescription || currentPublication.description || '');
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
    };
    
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const copyToClipboard = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareMenu(false);
      // You could show a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-12">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="h-64 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (error || !currentPublication) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-12">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold text-au-grey-text mb-4">Publication Not Found</h1>
            <p className="text-au-grey-text/70 mb-6">{error || 'The publication you are looking for does not exist.'}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const firstAttachment = publication.attachments?.[0];
  const firstAttachmentMime = firstAttachment?.mimeType || '';
  const isFirstAttachmentVideo = firstAttachmentMime.startsWith('video/');
  const hideCoverImage = Boolean(firstAttachment?.mimeType?.startsWith('video/'));
  const hasMoreComments = commentsPagination.page < commentsPagination.totalPages;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      
      <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-8 md:py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-au-grey-text hover:text-au-corporate-green transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md">
          {/* Cover Image */}
          {publication.coverImage && !isFirstAttachmentVideo && (
            <div className="relative w-full h-64 md:h-96 overflow-hidden">
              <img
                src={getImageUrl(publication.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
                alt={publication.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8 lg:p-12">
            {/* First Attachment Preview - Show before title for all categories */}
            {(() => {
              if (!publication.attachments || publication.attachments.length === 0) {
                return null;
              }

              if (!firstAttachment) {
                return null;
              }

              const isAudio = firstAttachmentMime.startsWith('audio/');
              const isImage = firstAttachmentMime.startsWith('image/');
              const isPdf = firstAttachmentMime === 'application/pdf';

              if (mediaBlobUrl && (isFirstAttachmentVideo || isAudio || isImage || isPdf)) {
                return (
                  <div className="mb-8">
                    {isFirstAttachmentVideo ? (
                      <video
                        controls
                        className="w-full rounded-lg shadow-md"
                        preload="auto"
                        style={{ maxHeight: '600px' }}
                      >
                        <source src={mediaBlobUrl} type={firstAttachmentMime} />
                        Your browser does not support the video tag.
                      </video>
                    ) : isAudio ? (
                      <div className="bg-gray-100 rounded-lg p-6 shadow-md">
                        <audio
                          controls
                          className="w-full"
                          preload="auto"
                        >
                          <source src={mediaBlobUrl} type={firstAttachmentMime} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : isImage ? (
                      <div className="w-full rounded-lg shadow-md overflow-hidden">
                        <img
                          src={mediaBlobUrl}
                          alt={firstAttachment.originalName}
                          className="w-full h-auto max-h-[600px] object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : isPdf ? (
                      <div className="w-full rounded-lg shadow-md overflow-hidden" style={{ height: '600px' }}>
                        <iframe
                          src={mediaBlobUrl}
                          className="w-full h-full"
                          title={firstAttachment.originalName}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              } else if (firstAttachment && (isFirstAttachmentVideo || isAudio || isImage || isPdf)) {
                // Show loading state while fetching blob
                return (
                  <div className="mb-8 bg-gray-100 rounded-lg p-6 shadow-md flex items-center justify-center" style={{ minHeight: '200px' }}>
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-au-corporate-green mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading preview...</p>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}

            {/* Header */}
            <div className="mb-6">
              {/* Category Badge */}
              {publication.category && (
                <Link
                  href={`/category/${publication.category.slug}`}
                  className="inline-block bg-au-corporate-green text-white px-3 py-1 rounded text-sm font-medium mb-4 hover:bg-au-corporate-green/90 transition-colors"
                >
                  {publication.category.name}
                </Link>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-au-grey-text mb-4">
                {publication.title}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-au-grey-text/70 mb-6">
                {publication.creator && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      {publication.creator.firstName || publication.creator.username}
                    </span>
                  </div>
                )}
                {publication.publicationDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(publication.publicationDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{publication.views || 0} views</span>
                </div>
                {publication.hasComments && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>{commentsCount} comments</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 mb-6 relative">
                <div className="relative" ref={shareMenuRef}>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  {showShareMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[180px]">
                      <button
                        onClick={() => shareToSocial('twitter')}
                        className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-gray-100 transition-colors"
                      >
                        Twitter
                      </button>
                      <button
                        onClick={() => shareToSocial('facebook')}
                        className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-gray-100 transition-colors"
                      >
                        Facebook
                      </button>
                      <button
                        onClick={() => shareToSocial('linkedin')}
                        className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-gray-100 transition-colors"
                      >
                        LinkedIn
                      </button>
                      <button
                        onClick={() => shareToSocial('whatsapp')}
                        className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-gray-100 transition-colors"
                      >
                        WhatsApp
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={copyToClipboard}
                        className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-gray-100 transition-colors"
                      >
                        Copy Link
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleToggleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                    isLiked ? 'bg-au-corporate-green text-white hover:bg-au-corporate-green/90' : 'bg-gray-100 text-au-grey-text hover:bg-gray-200'
                  } ${likeLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {isLiked ? 'Liked' : 'Like'} ({likesCount})
                </button>
              </div>

              {/* Subcategories */}
              {publication.subcategories && publication.subcategories.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-au-grey-text mb-2">Subcategories:</h3>
                  <div className="flex flex-wrap gap-2">
                    {publication.subcategories.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        href={`/category/${publication.category?.slug}/${subcategory.slug}`}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-au-grey-text transition-colors"
                      >
                        {subcategory.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {publication.description && (
                <div className="mb-8">
                  <div
                    className="prose max-w-none text-au-grey-text"
                    dangerouslySetInnerHTML={{ __html: publication.description }}
                  />
                </div>
              )}

              {/* Attachments */}
              {publication.attachments && publication.attachments.length > 0 && (
                <div className="border-t border-gray-200 pt-8">
                  <h2 className="text-xl font-bold text-au-grey-text mb-4">Attachments</h2>
                  <div className="space-y-3">
                    {publication.attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.mimeType);
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileIcon className="h-5 w-5 text-au-grey-text/70 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-au-grey-text truncate">
                                {attachment.originalName}
                              </p>
                              <p className="text-xs text-au-grey-text/70">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePreview(attachment)}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm"
                            >
                              <EyeIcon className="h-4 w-4" />
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownload(attachment.id, attachment.originalName)}
                              className="flex items-center gap-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors text-sm"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comments Section */}
               <div className="border-t border-gray-200 pt-8 mt-8">
                {publication.hasComments ? (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                      <h2 className="text-xl font-bold text-au-grey-text">Comments ({commentsCount})</h2>
                      {commentsCount > 0 && (
                        <span className="text-sm text-au-grey-text/70">Showing {comments.length} of {commentsCount}</span>
                      )}
                    </div>

                    <form onSubmit={handleCommentSubmit} className="mb-6 space-y-4">
                      {!user && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-au-grey-text mb-1">Name *</label>
                            <input
                              type="text"
                              value={guestName}
                              onChange={(e) => setGuestName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                              placeholder="Your name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-au-grey-text mb-1">Email *</label>
                            <input
                              type="email"
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                              placeholder="your@email.com"
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-au-grey-text mb-1">Comment *</label>
                        <textarea
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                          placeholder="Share your thoughts..."
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={commentSubmitting}
                          className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {commentSubmitting ? 'Submitting...' : 'Post Comment'}
                        </button>
                      </div>
                    </form>

                    {commentsLoading && comments.length === 0 ? (
                      <div className="space-y-4">
                        <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                        <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-au-grey-text/70">No comments yet. Be the first to share your thoughts.</p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium text-au-grey-text">
                                {comment.authorName || comment.author?.firstName || comment.author?.username || 'Anonymous'}
                              </div>
                              <div className="text-xs text-au-grey-text/60">
                                {formatDateTime(comment.createdAt)}
                              </div>
                            </div>
                            <p className="text-sm text-au-grey-text leading-relaxed whitespace-pre-line">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {hasMoreComments && (
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={handleLoadMoreComments}
                          disabled={commentsLoadingMore}
                          className="px-4 py-2 bg-gray-100 text-au-grey-text rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {commentsLoadingMore ? 'Loading...' : 'Load more comments'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-au-grey-text/70">Comments are disabled for this publication.</p>
                )}
              </div>

            {/* Authors */}
            {publication.authors && publication.authors.length > 0 && (
              <div className="border-t border-gray-200 pt-8 mt-8">
                <h2 className="text-xl font-bold text-au-grey-text mb-4">Authors</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publication.authors.map((author) => (
                    <div key={author.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-au-corporate-green flex items-center justify-center text-white font-medium">
                        {(author.firstName?.[0] || author.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-au-grey-text">
                          {author.firstName || author.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-au-grey-text/70">{author.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Publications Carousel */}
            {relatedPublications && relatedPublications.length > 0 && (
              <div className="border-t border-gray-200 pt-8 mt-8">
                <PublicationsCarousel 
                  publications={relatedPublications} 
                  title="Related Publications"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
        }}
        file={previewFile}
      />
      <PublicFooter />
    </div>
  );
}

export default function PublicationDetailsPage() {
  return (
    <Provider store={store}>
      <PublicationDetailsContent />
    </Provider>
  );
}
