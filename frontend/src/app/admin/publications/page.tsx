'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Plus, Search, Edit, MoreVertical, X, Eye, Check, Send, Info, Filter } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { showSuccess } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { cn, getImageUrl } from '@/utils/fileUtils';
import PublicationPreviewModal from '@/components/PublicationPreviewModal';
import RejectionReasonModal from '@/components/RejectionReasonModal';
import PublicationDetailsModal from '@/components/PublicationDetailsModal';

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
  status: 'pending' | 'draft' | 'approved' | 'rejected' | 'scheduled';
  publicationDate?: string;
  rejectionReason?: string;
  hasComments: boolean;
  views: number;
  uniqueHits: number;
  isFeatured: boolean;
  isLeaderboard: boolean;
  source?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

function PublicationsPageContent() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') as 'pending' | 'draft' | 'approved' | 'rejected' | 'scheduled' | null;
  const urlScheduled = searchParams.get('scheduled');
  const urlCategoryId = searchParams.get('categoryId');
  const urlSubcategoryId = searchParams.get('subcategoryId');
  const updatingUrlRef = useRef(false);
  
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'draft' | 'approved' | 'rejected' | 'scheduled' | ''>(urlStatus || '');
  const [scheduledFilter, setScheduledFilter] = useState<boolean | null>(
    urlScheduled === 'true' ? true : urlScheduled === 'false' ? false : null
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(urlCategoryId || '');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>(urlSubcategoryId || '');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageLimit] = useState(20);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPublicationId, setSelectedPublicationId] = useState<string | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [publicationToReject, setPublicationToReject] = useState<Publication | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);

  const canManagePublicationFlags = Boolean(
    user?.isAdmin ||
    user?.permissions?.some((permission) =>
      ['posts:edit', 'posts:update', 'posts:approve', 'posts:manage'].includes(permission)
    )
  );

  const canApprovePublications = Boolean(
    user?.isAdmin ||
    user?.permissions?.includes('posts:approve')
  );

  const canPublishPublications = Boolean(
    user?.isAdmin ||
    user?.permissions?.some((permission) =>
      ['posts:create', 'posts:edit', 'posts:update', 'posts:manage', 'posts:approve'].includes(permission)
    )
  );

  // Load categories and subcategories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await apiClient.getCategories();
        if (response.success && response.data?.categories) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadCategories();
  }, []);

  // Load subcategories when category is selected
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!categoryFilter) {
        // Load all subcategories if no category selected
        try {
          const response = await apiClient.getSubcategories();
          if (response.success && response.data?.subcategories) {
            setSubcategories(response.data.subcategories);
          }
        } catch (error) {
          console.error('Failed to load subcategories:', error);
        }
      } else {
        // Load subcategories for selected category
        try {
          const response = await apiClient.getCategorySubcategories(categoryFilter);
          if (response.success && response.data?.subcategories) {
            const subcategories = response.data.subcategories;
            setSubcategories(subcategories);
            // Clear subcategory filter if it doesn't belong to selected category
            // Use functional update to get current value
            setSubcategoryFilter(current => {
              if (current) {
                const subcategoryIds = subcategories.map((s: { id: string }) => s.id);
                if (!subcategoryIds.includes(current)) {
                  return '';
                }
              }
              return current;
            });
          }
        } catch (error) {
          console.error('Failed to load subcategories:', error);
          setSubcategories([]);
          // Clear subcategory filter if loading failed
          setSubcategoryFilter('');
        }
      }
    };
    
    loadSubcategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]); // Only depend on categoryFilter

  // Sync filters with URL params when URL changes (e.g., browser back/forward)
  useEffect(() => {
    if (updatingUrlRef.current) {
      updatingUrlRef.current = false;
      return;
    }
    
    const currentStatus = searchParams.get('status') || '';
    const currentScheduled = searchParams.get('scheduled');
    const currentCategoryId = searchParams.get('categoryId') || '';
    const currentSubcategoryId = searchParams.get('subcategoryId') || '';
    const scheduled = currentScheduled === 'true' ? true : currentScheduled === 'false' ? false : null;
    
    if (currentStatus !== statusFilter) {
      setStatusFilter(currentStatus as typeof statusFilter);
    }
    if (scheduled !== scheduledFilter) {
      setScheduledFilter(scheduled);
    }
    if (currentCategoryId !== categoryFilter) {
      setCategoryFilter(currentCategoryId);
    }
    if (currentSubcategoryId !== subcategoryFilter) {
      setSubcategoryFilter(currentSubcategoryId);
    }
  }, [urlStatus, urlScheduled, urlCategoryId, urlSubcategoryId]);

  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (statusFilter) {
      newParams.set('status', statusFilter);
    }
    if (scheduledFilter !== null) {
      newParams.set('scheduled', scheduledFilter.toString());
    }
    if (categoryFilter) {
      newParams.set('categoryId', categoryFilter);
    }
    if (subcategoryFilter) {
      newParams.set('subcategoryId', subcategoryFilter);
    }
    const newUrl = newParams.toString() ? `/admin/publications?${newParams.toString()}` : '/admin/publications';
    
    // Only update URL if it's different from current URL
    const currentUrl = `/admin/publications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    if (newUrl !== currentUrl) {
      updatingUrlRef.current = true;
      router.replace(newUrl, { scroll: false });
    }
  }, [statusFilter, scheduledFilter, categoryFilter, subcategoryFilter, router, searchParams]);

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
  }, [statusFilter, scheduledFilter, categoryFilter, subcategoryFilter]);

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
      
      // Handle status filter
      // If status is 'scheduled', use scheduled filter instead
      if (statusFilter === 'scheduled') {
        filters.scheduled = true;
      } else if (statusFilter) {
        filters.status = statusFilter;
      }
      
      // Handle scheduled checkbox filter (only if status filter is not 'scheduled')
      if (statusFilter !== 'scheduled' && scheduledFilter !== null) {
        filters.scheduled = scheduledFilter;
      }
      
      if (categoryFilter) {
        filters.categoryId = categoryFilter;
      }
      
      if (subcategoryFilter) {
        filters.subcategoryId = subcategoryFilter;
      }
      
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
    if (statusFilter === 'pending') return t('nav.pendingPublications');
    if (statusFilter === 'draft') return t('nav.draftPublications');
    if (statusFilter === 'rejected') return t('nav.rejectedPublications');
    if (statusFilter === 'scheduled' || scheduledFilter === true) return t('publications.statusLabels.scheduled') || 'Scheduled';
    if (statusFilter === 'approved') return t('publications.statusLabels.published') || 'Published';
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
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };


  const getEditUrl = (publicationId: string) => {
    return ['', 'admin', 'publications', publicationId, 'edit'].join('/');
  };

  const handleUpdatePublicationFlags = async (
    publicationId: string,
    updates: { isFeatured?: boolean; isLeaderboard?: boolean },
    successMessage: string
  ) => {
    setActionMenuOpen(null);
    try {
      const response = await apiClient.updatePublication(publicationId, updates);

      if (response.success) {
        showSuccess(successMessage);
        await loadPublications(currentPage);
      } else {
        throw new Error(response.error?.message || t('publications.failedToUpdatePublication'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleToggleFeatured = async (publication: Publication) => {
    const shouldFeature = !publication.isFeatured;
    await handleUpdatePublicationFlags(
      publication.id,
      { isFeatured: shouldFeature },
      shouldFeature ? t('publications.featuredAddedSuccess') : t('publications.featuredRemovedSuccess')
    );
  };

  const handleToggleLeadership = async (publication: Publication) => {
    const shouldBeOnLeadership = !publication.isLeaderboard;
    await handleUpdatePublicationFlags(
      publication.id,
      { isLeaderboard: shouldBeOnLeadership },
      shouldBeOnLeadership ? t('publications.leadershipAddedSuccess') : t('publications.leadershipRemovedSuccess')
    );
  };

  const handleApprovePublication = async (publication: Publication) => {
    setActionMenuOpen(null);
    try {
      const response = await apiClient.approvePublication(publication.id);
      if (response.success) {
        showSuccess(t('publications.publicationApproved') || 'Publication approved successfully');
        await loadPublications(currentPage);
      } else {
        throw new Error(response.error?.message || t('publications.failedToUpdatePublication'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleRejectPublication = (publication: Publication) => {
    setActionMenuOpen(null);
    setPublicationToReject(publication);
    setRejectionModalOpen(true);
  };

  const handleConfirmRejection = async (rejectionReason: string) => {
    if (!publicationToReject) return;

    setIsRejecting(true);
    try {
      const response = await apiClient.rejectPublication(publicationToReject.id, rejectionReason);
      if (response.success) {
        showSuccess(t('publications.publicationRejected') || 'Publication rejected successfully');
        setRejectionModalOpen(false);
        setPublicationToReject(null);
        await loadPublications(currentPage);
      } else {
        throw new Error(response.error?.message || t('publications.failedToUpdatePublication'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePublishPublication = async (publication: Publication) => {
    setActionMenuOpen(null);
    try {
      const response = await apiClient.updatePublication(publication.id, { status: 'pending' });
      if (response.success) {
        showSuccess(t('publications.publicationPublished') || 'Publication moved to Pending successfully');
        await loadPublications(currentPage);
      } else {
        throw new Error(response.error?.message || t('publications.failedToUpdatePublication'));
      }
    } catch (error) {
      handleError(error);
    }
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

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          {/* Search */}
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
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{t('common.filters') || 'Filters'}:</span>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm text-gray-600">
                {t('publications.status')}:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none bg-white"
              >
                <option value="">{t('common.all') || 'All'}</option>
                <option value="draft">{t('publications.statusLabels.draft') || 'Draft'}</option>
                <option value="pending">{t('publications.statusLabels.pending') || 'Pending'}</option>
                <option value="approved">{t('publications.statusLabels.published') || 'Published'}</option>
                <option value="scheduled">{t('publications.statusLabels.scheduled') || 'Scheduled'}</option>
                <option value="rejected">{t('publications.statusLabels.rejected') || 'Rejected'}</option>
              </select>
            </div>
            
            {/* Scheduled Filter */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduledFilter === true}
                  onChange={(e) => {
                    setScheduledFilter(e.target.checked ? true : null);
                    // If checking scheduled, set status to empty (scheduled overrides status)
                    if (e.target.checked && statusFilter !== 'scheduled') {
                      setStatusFilter('');
                    }
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                />
                <span>{t('publications.statusLabels.scheduled') || 'Scheduled Only'}</span>
              </label>
              {(scheduledFilter === true || statusFilter === 'scheduled') && (
                <button
                  onClick={() => {
                    setScheduledFilter(null);
                    if (statusFilter === 'scheduled') {
                      setStatusFilter('');
                    }
                    setCurrentPage(1);
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="category-filter" className="text-sm text-gray-600">
                {t('publications.category')}:
              </label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setSubcategoryFilter(''); // Clear subcategory when category changes
                  setCurrentPage(1);
                }}
                disabled={loadingCategories}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none bg-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
              >
                <option value="">{t('common.all') || 'All'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Subcategory Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="subcategory-filter" className="text-sm text-gray-600">
                {t('publications.subcategories')}:
              </label>
              <select
                id="subcategory-filter"
                value={subcategoryFilter}
                onChange={(e) => {
                  setSubcategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={loadingCategories || (Boolean(categoryFilter) && subcategories.length === 0)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none bg-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
              >
                <option value="">{t('common.all') || 'All'}</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
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
                                src={getImageUrl(publication.coverImage)}
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
                          <div className="flex flex-col items-start gap-1">
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', getStatusBadgeColor(publication.status))}>
                              {publication.status === 'approved' ? t('publications.statusApproved') :
                               publication.status === 'pending' ? t('nav.pendingPublications') :
                               publication.status === 'rejected' ? t('publications.statusRejected') :
                               publication.status === 'draft' ? t('nav.draftPublications') :
                               publication.status === 'scheduled' ? t('publications.statusLabels.scheduled') || 'Scheduled' :
                               publication.status}
                            </span>
                            {publication.isFeatured && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 uppercase tracking-wide">
                                {t('publications.isFeatured')}
                              </span>
                            )}
                            {publication.isLeaderboard && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 uppercase tracking-wide">
                                {t('publications.isLeaderboard')}
                              </span>
                            )}
                          </div>
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
                                    setSelectedPublication(publication);
                                    setDetailsModalOpen(true);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100 flex items-center space-x-2"
                                >
                                  <Info size={14} />
                                  <span>{t('common.details') || 'Details'}</span>
                                </button>
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
                                  href={getEditUrl(publication.id)}
                                  className="block px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100 flex items-center space-x-2"
                                  onClick={() => setActionMenuOpen(null)}
                                >
                                  <Edit size={14} />
                                  <span>{t('common.edit')}</span>
                                </Link>
                                {canPublishPublications && publication.status === 'draft' && (
                                  <button
                                    onClick={() => handlePublishPublication(publication)}
                                    className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Send size={14} />
                                    <span>{t('publications.publish')}</span>
                                  </button>
                                )}
                                {canApprovePublications && publication.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApprovePublication(publication)}
                                      className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100 flex items-center space-x-2"
                                    >
                                      <Check size={14} />
                                      <span>{t('publications.approve')}</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectPublication(publication)}
                                      className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-red-500 hover:bg-red-50 flex items-center space-x-2"
                                    >
                                      <X size={14} />
                                      <span>{t('publications.reject') || 'Reject'}</span>
                                    </button>
                                  </>
                                )}
                                {publication.status === 'approved' && canManagePublicationFlags && (
                                  <>
                                    <button
                                      onClick={() => handleToggleFeatured(publication)}
                                      className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100"
                                    >
                                      {publication.isFeatured ? t('publications.removeFromFeatured') : t('publications.addToFeatured')}
                                    </button>
                                    <button
                                      onClick={() => handleToggleLeadership(publication)}
                                      className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-au-grey-text hover:bg-gray-100"
                                    >
                                      {publication.isLeaderboard ? t('publications.removeFromLeadershipList') : t('publications.addToLeadershipList')}
                                    </button>
                                  </>
                                )}
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
                  {t('common.showing')} {((currentPage - 1) * pageLimit) + 1} {' - '} {Math.min(currentPage * pageLimit, total)} {t('common.of')} {total} {t('publications.publications')}
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
        )}
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

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        isOpen={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setPublicationToReject(null);
        }}
        onConfirm={handleConfirmRejection}
        publicationTitle={publicationToReject?.title}
        isLoading={isRejecting}
      />

      {/* Publication Details Modal */}
      {selectedPublication && (
        <PublicationDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedPublication(null);
          }}
          publication={selectedPublication}
        />
      )}
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
