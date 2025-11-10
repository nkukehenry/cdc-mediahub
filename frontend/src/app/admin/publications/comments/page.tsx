'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { MessageSquare, Search, Loader2, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { cn, getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';

interface PublicationSummary {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  category?: {
    id: string;
    name: string;
  };
  hasComments: boolean;
  commentsCount: number;
  updatedAt: string;
}

interface PublicationComment {
  id: string;
  content: string;
  createdAt: string;
  authorName?: string | null;
  authorEmail?: string | null;
  author?: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    avatar?: string | null;
  } | null;
}

interface CommentsPagination {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  offset: number;
}

function CommentsManagementContent() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();

  const [publications, setPublications] = useState<PublicationSummary[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(20);

  const [selectedPublication, setSelectedPublication] = useState<PublicationSummary | null>(null);
  const [comments, setComments] = useState<PublicationComment[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<CommentsPagination | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [revokingCommentId, setRevokingCommentId] = useState<string | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const formatDate = useCallback((value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  }, []);

  const fetchPublications = useCallback(async (page: number = 1, query: string = '') => {
    try {
      setLoadingPublications(true);
      const filters: Record<string, string> = {};
      if (query.trim()) {
        filters.search = query.trim();
      }

      const response = await apiClient.getPublications(filters, page, pageSize);
      if (response.success && response.data?.publications) {
        const mapped = response.data.publications.map((publication: any) => ({
          id: publication.id,
          title: publication.title,
          slug: publication.slug,
          coverImage: publication.coverImage,
          category: publication.category ? {
            id: publication.category.id,
            name: publication.category.name,
          } : undefined,
          hasComments: Boolean(publication.hasComments),
          commentsCount: Number(publication.commentsCount || 0),
          updatedAt: publication.updatedAt,
        })) as PublicationSummary[];

        setPublications(mapped);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
          setTotalItems(response.data.pagination.total);
          setCurrentPage(response.data.pagination.page);
        } else {
          setTotalPages(1);
          setTotalItems(mapped.length);
          setCurrentPage(1);
        }
      } else {
        setPublications([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      handleError(error);
      setPublications([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoadingPublications(false);
    }
  }, [handleError, pageSize]);

  const fetchComments = useCallback(async (publication: PublicationSummary, offset = 0) => {
    try {
      if (offset === 0) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const limit = 20;
      const response = await apiClient.getPostComments(publication.id, { limit, offset });

      if (response.success && response.data) {
        const fetchedComments = response.data.comments || [];
        const pagination = response.data.pagination || {
          total: fetchedComments.length,
          page: 1,
          totalPages: 1,
          limit,
          offset,
        };

        if (offset === 0) {
          setComments(fetchedComments);
        } else {
          setComments((prev) => [...prev, ...fetchedComments]);
        }
        setCommentsPagination(pagination);
      } else if (offset === 0) {
        setComments([]);
        setCommentsPagination(null);
      }
    } catch (error) {
      handleError(error);
      if (offset === 0) {
        setComments([]);
        setCommentsPagination(null);
      }
    } finally {
      if (offset === 0) {
        setLoadingComments(false);
      } else {
        setLoadingMoreComments(false);
      }
    }
  }, [handleError]);

  const handleOpenComments = useCallback(async (publication: PublicationSummary) => {
    setSelectedPublication(publication);
    await fetchComments(publication, 0);
  }, [fetchComments]);

  const handleLoadMoreComments = useCallback(async () => {
    if (!selectedPublication || !commentsPagination) {
      return;
    }
    const nextOffset = comments.length;
    if (nextOffset >= commentsPagination.total) {
      return;
    }
    await fetchComments(selectedPublication, nextOffset);
  }, [selectedPublication, commentsPagination, comments.length, fetchComments]);

  const handleCloseComments = useCallback(() => {
    setSelectedPublication(null);
    setComments([]);
    setCommentsPagination(null);
  }, []);

  const handleRevokeComment = useCallback(async (commentId: string) => {
    if (!selectedPublication) {
      return;
    }

    try {
      setRevokingCommentId(commentId);
      const response = await apiClient.deletePostComment(selectedPublication.id, commentId);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete comment');
      }

      const newCount = response.data?.commentsCount ?? Math.max(selectedPublication.commentsCount - 1, 0);

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setSelectedPublication((prev) => (prev ? { ...prev, commentsCount: newCount } : prev));
      setPublications((prev) =>
        prev.map((publication) =>
          publication.id === selectedPublication.id ? { ...publication, commentsCount: newCount } : publication
        )
      );
      setCommentsPagination((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedTotal = Math.max(prev.total - 1, 0);
        const limit = prev.limit || 1;
        const updatedTotalPages = Math.max(1, Math.ceil(updatedTotal / limit));
        const updatedPage = Math.min(prev.page, updatedTotalPages);
        return {
          ...prev,
          total: updatedTotal,
          totalPages: updatedTotalPages,
          page: updatedPage,
        };
      });
    } catch (error) {
      handleError(error);
    } finally {
      setRevokingCommentId(null);
    }
  }, [handleError, selectedPublication, setPublications]);

  useEffect(() => {
    fetchPublications(1, searchQuery);
  }, [fetchPublications]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      fetchPublications(1, searchQuery);
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, fetchPublications]);

  const handlePageChange = useCallback((page: number) => {
    fetchPublications(page, searchQuery);
  }, [fetchPublications, searchQuery]);

  const emptyState = useMemo(() => {
    if (loadingPublications) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-8 h-8 text-au-corporate-green animate-spin" />
          <p className="text-sm text-au-grey-text/70">{t('common.loading')}...</p>
        </div>
      );
    }

    if (searchQuery.trim()) {
      return (
        <div className="text-center py-16">
          <p className="text-sm text-au-grey-text/70">{t('publications.noPublications') || 'No publications found.'}</p>
        </div>
      );
    }

    return (
      <div className="text-center py-16">
        <p className="text-sm text-au-grey-text/70">{t('publications.noPublications') || 'No publications found.'}</p>
      </div>
    );
  }, [loadingPublications, searchQuery, t]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-au-corporate-green" />
              {t('nav.comments')}
            </h1>
            <p className="text-sm text-au-grey-text/70 mt-1">
              Monitor publications discussions and moderate audience engagement.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('categories.searchPlaceholder') || 'Search publications'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none text-black"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('publications.title')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    {t('publications.category')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('publications.hasComments')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comments
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    {t('publications.updatedAt') || 'Last Updated'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('publications.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!loadingPublications && publications.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{emptyState}</td>
                  </tr>
                ) : loadingPublications ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="h-4 bg-gray-100 rounded w-16 mx-auto" />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="h-4 bg-gray-100 rounded w-12 mx-auto" />
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="h-4 bg-gray-100 rounded w-24" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="h-8 bg-gray-100 rounded w-20 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  publications.map((publication) => (
                    <tr key={publication.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {publication.coverImage ? (
                            <img
                              src={getImageUrl(publication.coverImage)}
                              alt={publication.title}
                              className="w-12 h-12 rounded object-cover border border-gray-200"
                              onError={(event) => {
                                const target = event.currentTarget;
                                target.onerror = null;
                                target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-au-grey-text/10 flex items-center justify-center text-au-grey-text text-sm font-medium">
                              {publication.title.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-au-grey-text line-clamp-1">{publication.title}</div>
                            <div className="text-xs text-au-grey-text/60 line-clamp-1">{publication.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-au-grey-text hidden md:table-cell">
                        {publication.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              publication.hasComments
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {publication.hasComments ? t('common.yes') : t('common.no')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-au-grey-text text-center">
                        {publication.commentsCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-au-grey-text hidden lg:table-cell">
                        {formatDate(publication.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenComments(publication)}
                          className="inline-flex items-center px-3 py-2 text-xs md:text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition"
                        >
                          <MessageSquare size={14} className="mr-2" />
                          {t('common.view')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs md:text-sm text-au-grey-text/70 text-center sm:text-left">
                {t('common.showing')} {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalItems)} {t('common.of')} {totalItems}
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      handlePageChange(currentPage - 1);
                    }
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs md:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.previous')}
                </button>
                <span className="px-2 py-1 text-xs md:text-sm text-au-grey-text">
                  {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                </span>
                <button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      handlePageChange(currentPage + 1);
                    }
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs md:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPublication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseComments} />
          <div className="relative w-full max-w-3xl mx-4 bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-start gap-3 p-4 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-au-grey-text">{selectedPublication.title}</h2>
                <p className="text-xs text-au-grey-text/70 mt-1">{selectedPublication.slug}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                    {selectedPublication.commentsCount} comments
                  </span>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      selectedPublication.hasComments ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {selectedPublication.hasComments ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseComments}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="w-8 h-8 text-au-corporate-green animate-spin" />
                  <p className="text-sm text-au-grey-text/70">{t('common.loading')}...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-au-grey-text/70">No comments have been submitted on this publication yet.</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const isRevoking = revokingCommentId === comment.id;
                  const authorDisplay =
                    comment.authorName ||
                    comment.author?.firstName ||
                    comment.author?.username ||
                    comment.authorEmail ||
                    'Anonymous';
                  const avatarSrc = comment.author?.avatar ? getImageUrl(comment.author.avatar) : null;
                  const fallbackAvatar = getImageUrl(PLACEHOLDER_IMAGE_PATH);

                  const initials = authorDisplay
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={comment.id} className="border border-gray-100 rounded-lg p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-au-grey-text/10 flex items-center justify-center overflow-hidden">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={authorDisplay}
                              className="w-full h-full object-cover"
                              onError={(event) => {
                                const target = event.currentTarget;
                                target.onerror = null;
                                target.src = fallbackAvatar;
                              }}
                            />
                          ) : (
                            <span className="text-sm font-semibold text-au-grey-text">{initials || 'A'}</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium text-au-grey-text">{authorDisplay}</div>
                              {comment.authorEmail && (
                                <div className="text-xs text-au-grey-text/60">{comment.authorEmail}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-xs text-au-grey-text/60">{formatDate(comment.createdAt)}</div>
                              <button
                                type="button"
                                onClick={() => handleRevokeComment(comment.id)}
                                disabled={isRevoking}
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isRevoking ? (
                                  <span className="flex items-center gap-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {t('common.loading')}
                                  </span>
                                ) : (
                                  t('common.delete')
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-au-grey-text whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {commentsPagination && comments.length < commentsPagination.total && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-center">
                <button
                  onClick={handleLoadMoreComments}
                  disabled={loadingMoreComments}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingMoreComments ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load more comments'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommentsManagementPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-au-corporate-green animate-spin" />
      </div>
    }>
      <CommentsManagementContent />
    </Suspense>
  );
}

