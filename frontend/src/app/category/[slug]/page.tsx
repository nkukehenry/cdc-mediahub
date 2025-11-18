'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import { store, RootState } from '@/store';
import { fetchPublications } from '@/store/publicationsSlice';
import { Search, X, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PublicationCard from '@/components/PublicationCard';
import { apiClient } from '@/utils/apiClient';
import { cn } from '@/utils/fileUtils';
import PublicationCardSkeleton from '@/components/PublicationCardSkeleton';
import Skeleton from '@/components/Skeleton';
import { isAudioPublication } from '@/utils/publicationUtils';

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

function CategoryPageInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  
  const { publications, loading, pagination } = useSelector((state: RootState) => state.publications);
  
  const categorySlug = params?.slug as string;
  
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [author, setAuthor] = useState('');
  const [creator, setCreator] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [source, setSource] = useState('');
  const [division, setDivision] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasLoadedAtLeastOnce, setHasLoadedAtLeastOnce] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const limit = 12;

  useEffect(() => {
    loadCategory();
    loadCategories();
    loadTags();
  }, [categorySlug]);

  useEffect(() => {
    const tagParams = searchParams.getAll('tags');
    if (tagParams.length > 0) {
      setSelectedTags(new Set(tagParams));
    } else {
      setSelectedTags(new Set());
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentCategory) {
      void loadPublications();
    }
  }, [currentPage, searchQuery, selectedSubcategories, selectedTags, currentCategory]);

  const loadCategory = async () => {
    try {
      const response = await apiClient.getCategories();
      if (response.success && response.data?.categories) {
        const category = response.data.categories.find((cat: Category) => cat.slug === categorySlug);
        if (category) {
          const subRes = await apiClient.getCategorySubcategories(category.id);
          setCurrentCategory({
            ...category,
            subcategories: subRes.success && subRes.data?.subcategories
              ? subRes.data.subcategories
              : []
          });
        }
      }
    } catch (error) {
      console.error('Failed to load category:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      if (response.success && response.data?.categories) {
        const categoriesWithSubs = await Promise.all(
          response.data.categories.map(async (cat: Category) => {
            try {
              const subRes = await apiClient.getCategorySubcategories(cat.id);
              return {
                ...cat,
                subcategories: subRes.success && subRes.data?.subcategories
                  ? subRes.data.subcategories
                  : []
              };
            } catch {
              return { ...cat, subcategories: [] };
            }
          })
        );
        setCategories(categoriesWithSubs);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await apiClient.getTags();
      if (response.success && response.data?.tags) {
        const tagNames = response.data.tags
          .map((tag: { name: string }) => tag.name)
          .filter((name: string) => typeof name === 'string' && name.trim().length > 0);
        setTags(Array.from(new Set(tagNames.map((name: string) => name.trim()))));
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadPublications = useCallback(async () => {
    if (!currentCategory) return;
    
    const filters: any = {
      categoryId: currentCategory.id
    };
    
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (selectedSubcategories.size > 0) {
      filters.subcategoryId = Array.from(selectedSubcategories)[0];
    }
    if (selectedTags.size > 0) {
      filters.tags = Array.from(selectedTags);
    }
    if (author.trim()) filters.author = author.trim();
    if (creator.trim()) filters.creator = creator.trim();
    if (yearFrom.trim()) filters.yearFrom = yearFrom.trim();
    if (yearTo.trim()) filters.yearTo = yearTo.trim();
    if (publicationDate.trim()) filters.publicationDate = publicationDate.trim();
    if (source.trim()) filters.source = source.trim();
    if (division.trim()) filters.division = division.trim();

    setIsSearching(true);

    try {
      await dispatch(fetchPublications({ filters, page: currentPage, limit }) as any);
    } catch (error) {
      console.error('Failed to load publications:', error);
    } finally {
      setHasLoadedAtLeastOnce(true);
      setIsSearching(false);
    }
  }, [dispatch, currentCategory, searchQuery, selectedSubcategories, selectedTags, author, creator, yearFrom, yearTo, publicationDate, source, division, currentPage, limit]);

  const handleApplyFilters = () => {
    if (!currentCategory) return;
    
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedSubcategories.size > 0) {
      Array.from(selectedSubcategories).forEach(subId => params.append('subcategoryId', subId));
    }
    if (selectedTags.size > 0) {
      Array.from(selectedTags).forEach(tag => params.append('tags', tag));
    }
    if (author.trim()) params.set('author', author.trim());
    if (creator.trim()) params.set('creator', creator.trim());
    if (yearFrom.trim()) params.set('yearFrom', yearFrom.trim());
    if (yearTo.trim()) params.set('yearTo', yearTo.trim());
    if (publicationDate.trim()) params.set('publicationDate', publicationDate.trim());
    if (source.trim()) params.set('source', source.trim());
    if (division.trim()) params.set('division', division.trim());
    params.set('page', '1');
    
    router.push(`/category/${categorySlug}?${params.toString()}`);
    void loadPublications();
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setSelectedSubcategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subcategoryId)) {
        newSet.delete(subcategoryId);
      } else {
        newSet.add(subcategoryId);
      }
      return newSet;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSubcategories(new Set());
    setSelectedTags(new Set());
    setAuthor('');
    setCreator('');
    setYearFrom('');
    setYearTo('');
    setPublicationDate('');
    setSource('');
    setDivision('');
    router.push(`/category/${categorySlug}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/category/${categorySlug}?${params.toString()}`);
  };

  const totalPages = pagination?.totalPages || 1;
  const shouldShowSkeleton = loading && !hasLoadedAtLeastOnce;

  // Get subcategories for the current category
  const subcategoryOptions = useMemo(() => {
    if (!currentCategory?.subcategories) return [];
    return currentCategory.subcategories.map(subcat => ({
      id: subcat.id,
      name: subcat.name,
    }));
  }, [currentCategory]);

  if (!currentCategory && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="container mx-auto px-6 md:px-16 lg:px-24 xl:px-32 py-4">
          <div className="text-center py-12">
            <p className="text-au-grey-text/70 text-lg">Category not found</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="container mx-auto px-6 md:px-16 lg:px-24 xl:px-32 py-4">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-au-corporate-green mb-1">
            {currentCategory?.name || 'Category'}
          </h1>
          {loading ? (
            <Skeleton className="h-4 w-48 rounded-md" />
          ) : pagination && (
            <p className="text-xs text-au-grey-text/70">
              Showing {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, pagination.total)} of {pagination.total} publications
            </p>
          )}
        </div>

        {/* Search and Filters Panel - Top */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-4 mb-3">
          {/* Search Bar */}
          <div className="mb-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
                  placeholder="Search publications..."
                  className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleApplyFilters}
                className="bg-au-corporate-green hover:bg-au-corporate-green/90 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>

          {/* Quick Filters Row */}
          {(subcategoryOptions.length > 0 || tags.length > 0) && (
            <div className="flex flex-wrap items-start gap-4 mb-3 pb-3 border-b border-gray-200">
              {/* Subcategories */}
              {subcategoryOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-au-grey-text uppercase whitespace-nowrap">Subcategories:</span>
                  {subcategoryOptions.slice(0, 6).map((subcat) => (
                    <button
                      key={subcat.id}
                      onClick={() => toggleSubcategory(subcat.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                        selectedSubcategories.has(subcat.id)
                          ? 'bg-au-corporate-green text-white'
                          : 'bg-gray-100 text-au-grey-text hover:bg-gray-200'
                      )}
                    >
                      {subcat.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-au-grey-text uppercase whitespace-nowrap">Tags:</span>
                  {tags.slice(0, 6).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                        selectedTags.has(tag)
                          ? 'bg-au-corporate-green text-white'
                          : 'bg-gray-100 text-au-grey-text hover:bg-gray-200'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* More Filters Collapsible */}
          <div className={cn(
            "pt-3",
            (subcategoryOptions.length > 0 || tags.length > 0) ? "border-t border-gray-200 mt-3" : "mt-0"
          )}>
            <button
              onClick={() => setIsMoreFiltersOpen(!isMoreFiltersOpen)}
              className="flex items-center justify-between w-full text-xs font-semibold text-au-grey-text hover:text-au-corporate-green transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                More Filters
              </span>
              {isMoreFiltersOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {isMoreFiltersOpen && (
              <div className="mt-3 space-y-3">
                {/* Subcategories */}
                {subcategoryOptions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-au-grey-text mb-1.5 uppercase tracking-wide">Sub-Categories</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                      {subcategoryOptions.map((subcat) => (
                        <label key={subcat.id} className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSubcategories.has(subcat.id)}
                            onChange={() => toggleSubcategory(subcat.id)}
                            className="w-3.5 h-3.5 text-au-corporate-green border-gray-300 rounded focus:ring-au-corporate-green"
                          />
                          <span className="text-xs text-au-grey-text">{subcat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Tags */}
                {tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-au-grey-text mb-1.5 uppercase tracking-wide">All Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                            selectedTags.has(tag)
                              ? 'bg-au-corporate-green text-white'
                              : 'bg-gray-100 text-au-grey-text hover:bg-gray-200'
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Publication Details */}
                <div>
                  <h3 className="text-xs font-semibold text-au-grey-text mb-2 uppercase tracking-wide">Publication Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Author</label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Enter author name"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Creator</label>
                      <input
                        type="text"
                        value={creator}
                        onChange={(e) => setCreator(e.target.value)}
                        placeholder="Enter creator name"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Publication Date</label>
                      <input
                        type="date"
                        value={publicationDate}
                        onChange={(e) => setPublicationDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Year From</label>
                      <input
                        type="text"
                        value={yearFrom}
                        onChange={(e) => setYearFrom(e.target.value)}
                        placeholder="From"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Year To</label>
                      <input
                        type="text"
                        value={yearTo}
                        onChange={(e) => setYearTo(e.target.value)}
                        placeholder="To"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Source</label>
                      <input
                        type="text"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="Enter source"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <button
                    onClick={handleApplyFilters}
                    className="bg-au-corporate-green hover:bg-au-corporate-green/90 text-white px-5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Apply Filters
                  </button>
                  {(searchQuery || selectedSubcategories.size > 0 || selectedTags.size > 0 || author || creator || yearFrom || yearTo || publicationDate || source || division) && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-au-grey-text/70 hover:text-au-corporate-green transition-colors underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="w-full">

            {/* Loading State */}
            {shouldShowSkeleton && (
              <div className="space-y-6">
                <div className="h-5 w-60 rounded-md bg-gray-200 animate-pulse" />
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full" 
                  style={{ 
                    gridAutoRows: '50px',
                    gridAutoFlow: 'row dense',
                    columnGap: '5px',
                    rowGap: '2px'
                  }}
                >
                  {Array.from({ length: 9 }).map((_, i) => {
                    const variants: ('small' | 'medium' | 'large' | 'default')[] = [
                      'large', 'medium', 'small', 'medium', 
                      'default', 'large', 'small', 'medium',
                      'medium'
                    ];
                    const variant = variants[i % variants.length] || 'default';
                    const rowSpans: Record<string, string> = {
                      'small': 'row-span-5',
                      'medium': 'row-span-6',
                      'large': 'row-span-10',
                      'default': 'row-span-6'
                    };
                    const rowSpan = rowSpans[variant] || 'row-span-6';
                    return (
                      <div key={i} className={rowSpan}>
                        <PublicationCardSkeleton />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Publications Grid - Collage Layout */}
            {!shouldShowSkeleton && publications.length > 0 && (
              <>
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-[5px] w-full" 
                  style={{ 
                    gridAutoRows: '50px',
                    gridAutoFlow: 'row dense',
                    columnGap: '5px',
                    rowGap: '2px'
                  }}
                >
                  {publications.map((publication, index) => {
                    // Create collage effect with varied sizes
                    // Pattern: large, medium, small, medium, default, large, small, medium
                    const variants: ('small' | 'medium' | 'large' | 'default')[] = [
                      'large', 'medium', 'small', 'medium', 
                      'default', 'large', 'small', 'medium',
                      'medium', 'small', 'large', 'default'
                    ];
                    const variant = variants[index % variants.length] || 'default';
                    
                    // Map variant to row span for vertical alignment
                    const rowSpans: Record<string, string> = {
                      'small': 'row-span-5',
                      'medium': 'row-span-6',
                      'large': 'row-span-10',
                      'default': 'row-span-6'
                    };
                    const rowSpan = rowSpans[variant] || 'row-span-6';
                    
                    return (
                      <div
                        key={publication.id}
                        className={isAudioPublication(publication) ? 'row-span-3' : rowSpan}
                      >
                        <PublicationCard publication={publication} variant={variant} />
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200'
                      )}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={cn(
                              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                              currentPage === page
                                ? 'bg-au-corporate-green text-white'
                                : 'bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200'
                            )}
                          >
                            {page}
                          </button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="px-2 text-gray-400">...</span>
                          <button
                            onClick={() => goToPage(totalPages)}
                            className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200'
                      )}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    {totalPages > 5 && (
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={cn(
                          'p-2 rounded-lg transition-colors ml-2',
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200'
                        )}
                      >
                        <ChevronRight className="h-5 w-5" />
                        <ChevronRight className="h-5 w-5 -ml-3" />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!shouldShowSkeleton && publications.length === 0 && (
              <div className="text-center py-12">
                <p className="text-au-grey-text/70 text-lg mb-4">No publications found in this category</p>
                {(searchQuery || selectedSubcategories.size > 0 || selectedTags.size > 0 || author || creator || yearFrom || yearTo || publicationDate || source || division) && (
                  <button
                    onClick={clearFilters}
                    className="text-au-corporate-green hover:underline"
                  >
                    Clear filters to see all publications
                  </button>
                )}
              </div>
            )}
          </main>
      </div>
      <PublicFooter />
    </div>
  );
}

function CategoryPageContent() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <CategoryPageInner />
    </Suspense>
  );
}

export default function CategoryPage() {
  return (
    <Provider store={store}>
      <CategoryPageContent />
    </Provider>
  );
}
