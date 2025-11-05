'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Plus, Search, Edit, Trash2, MoreVertical, X, Eye } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { showSuccess } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/fileUtils';
import PublicationPreviewModal from '@/components/PublicationPreviewModal';

interface Publication {
  id: string;
  title: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  coverImage?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  creatorId: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'draft' | 'approved' | 'rejected';
  publicationDate?: string;
  hasComments: boolean;
  views: number;
  uniqueHits: number;
  isFeatured: boolean;
  isLeaderboard: boolean;
  createdAt: string;
  updatedAt: string;
}

function PublicationsPageContent() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') as 'pending' | 'draft' | 'approved' | 'rejected' | null;
  
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageLimit] = useState(20);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPublicationId, setSelectedPublicationId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadPublications(1);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    loadPublications(1);
  }, [status]);

  // Close action menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let clickedOutside = true;

      menuRefs.current.forEach((menu) => {
        if (menu && menu.contains(target)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        setActionMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPublications = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const filters: any = {};
      if (status) filters.status = status;
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      
      const response = await apiClient.getPublications(filters, page, pageLimit);
      
      if (response.success && response.data) {
        setPublications(response.data.publications);
        if (response.data.pagination) {
          setTotal(response.data.pagination.total);
          setTotalPages(response.data.pagination.totalPages);
          setCurrentPage(response.data.pagination.page);
        }
      } else {
        handleError(new Error(t('errors.failedToLoadPublications')));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (status === 'pending') return t('nav.pendingPublications');
    if (status === 'draft') return t('nav.draftPublications');
    if (status === 'rejected') return t('nav.rejectedPublications');
    return t('nav.allPublications');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-au-grey-text">{t('common.loading')}...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text">{getTitle()}</h1>
          <Link
            href="/admin/publications/new"
            className="px-3 md:px-4 py-2 text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center space-x-2 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{t('nav.createPublication')}</span>
            <span className="sm:hidden">Create</span>
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('categories.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
            />
          </div>
        </div>

        {/* Publications Table */}
        {publications.length === 0 && !loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 text-center">
            <p className="text-sm md:text-base text-au-grey-text/70">{t('publications.noPublications')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto -mx-3 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('publications.title')}
                      </th>
                      <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        {t('publications.category')}
                      </th>
                      <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('publications.status')}
                      </th>
                      <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        {t('publications.createdAt')}
                      </th>
                      <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        {t('publications.views')}
                      </th>
                      <th className="px-3 md:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('publications.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {publications.map((publication) => (
                      <tr key={publication.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-4 py-3">
                          <div className="flex items-center space-x-2 md:space-x-3">
                            {publication.coverImage && (
                              <img
                                src={publication.coverImage.startsWith('http') ? publication.coverImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/${publication.coverImage}`}
                                alt={publication.title}
                                className="w-10 h-10 md:w-12 md:h-12 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm md:text-base text-au-grey-text truncate">{publication.title}</div>
                              <div className="text-xs md:text-sm text-gray-500 truncate">{publication.slug}</div>
                              <div className="md:hidden text-xs text-gray-500 mt-1">{publication.category?.name || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-sm text-au-grey-text hidden md:table-cell">
                          {publication.category?.name || '-'}
                        </td>
                        <td className="px-3 md:px-4 py-3">
                          <span className={cn('px-2 py-1 text-xs font-medium rounded-full', getStatusBadgeColor(publication.status))}>
                            {publication.status}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-sm text-au-grey-text hidden lg:table-cell">
                          {formatDate(publication.createdAt)}
                        </td>
                        <td className="px-3 md:px-4 py-3 text-sm text-au-grey-text hidden sm:table-cell">
                          {publication.views}
                        </td>
                        <td className="px-3 md:px-4 py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === publication.id ? null : publication.id)}
                              className="p-1 rounded hover:bg-gray-100 transition-colors"
                              aria-label="Actions"
                            >
                              <MoreVertical size={16} className="text-gray-500" />
                            </button>
                            {actionMenuOpen === publication.id && (
                              <div
                                ref={(el) => {
                                  if (el) menuRefs.current.set(publication.id, el);
                                }}
                                className="absolute right-0 mt-1 w-40 md:w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                              >
                                <button
                                  onClick={() => {
                                    setSelectedPublicationId(publication.id);
                                    setPreviewModalOpen(true);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100 flex items-center space-x-2"
                                >
                                  <Eye size={14} />
                                  <span>{t('common.view')}</span>
                                </button>
                                <Link
                                  href={`/admin/publications/${publication.id}/edit`}
                                  className="block px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100 flex items-center space-x-2"
                                  onClick={() => setActionMenuOpen(null)}
                                >
                                  <Edit size={14} />
                                  <span>{t('common.edit')}</span>
                                </Link>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-3 md:px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-xs md:text-sm text-gray-700 text-center sm:text-left">
                  {t('common.showing')} {((currentPage - 1) * pageLimit) + 1} - {Math.min(currentPage * pageLimit, total)} {t('common.of')} {total} {t('publications.publications')}
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <button
                    onClick={() => {
                      const newPage = currentPage - 1;
                      if (newPage >= 1) {
                        setCurrentPage(newPage);
                        loadPublications(newPage);
                      }
                    }}
                    disabled={currentPage === 1}
                    className="px-2 md:px-3 py-1 text-xs md:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.previous')}
                  </button>
                  <span className="px-2 md:px-3 py-1 text-xs md:text-sm text-gray-700">
                    {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = currentPage + 1;
                      if (newPage <= totalPages) {
                        setCurrentPage(newPage);
                        loadPublications(newPage);
                      }
                    }}
                    disabled={currentPage === totalPages}
                    className="px-2 md:px-3 py-1 text-xs md:text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publication Preview Modal */}
      <PublicationPreviewModal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedPublicationId(null);
        }}
        publicationId={selectedPublicationId}
        onUpdate={() => {
          loadPublications(currentPage);
        }}
        onApprove={() => {
          loadPublications(currentPage);
        }}
        onReject={() => {
          loadPublications(currentPage);
        }}
      />
    </div>
  );
}

export default function PublicationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <PublicationsPageContent />
    </Suspense>
  );
}
