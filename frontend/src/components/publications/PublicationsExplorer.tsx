'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Search, X, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { RootState } from '@/store';
import { fetchPublications } from '@/store/publicationsSlice';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PublicationCard from '@/components/PublicationCard';
import { apiClient } from '@/utils/apiClient';
import { cn } from '@/utils/fileUtils';
import PublicationCardSkeleton from '@/components/PublicationCardSkeleton';
import Skeleton from '@/components/Skeleton';

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

interface PublicationsExplorerProps {
  basePath?: string;
  searchParamKeys?: string[];
  pageTitle?: string;
}

const DEFAULT_SEARCH_PARAMS = ['search'];

const getPrimarySearchValue = (searchParams: ReturnType<typeof useSearchParams>, keys: string[]) => {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  return '';
};

export default function PublicationsExplorer({
  basePath = '/publications',
  searchParamKeys = DEFAULT_SEARCH_PARAMS,
  pageTitle = 'Publications',
}: PublicationsExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const { publications, loading, pagination } = useSelector((state: RootState) => state.publications);

  const [searchQuery, setSearchQuery] = useState(getPrimarySearchValue(searchParams, searchParamKeys));
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
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
    loadCategories();
    loadTags();
  }, []);

  useEffect(() => {
    const tagParams = searchParams.getAll('tags');
    if (tagParams.length > 0) {
      setSelectedTags(new Set(tagParams));
    } else {
      setSelectedTags(new Set());
    }
  }, [searchParams]);

  useEffect(() => {
    const paramsSearch = getPrimarySearchValue(searchParams, searchParamKeys);
    setSearchQuery((prev) => (prev === paramsSearch ? prev : paramsSearch));
  }, [searchParams, searchParamKeys]);

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
    const filters: any = {};
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (selectedCategories.size > 0) {
      filters.categoryId = Array.from(selectedCategories)[0];
    }
    if (selectedSubcategories.size > 0) {
      filters.subcategoryId = Array.from(selectedSubcategories)[0];
    }
    if (selectedTags.size > 0) {
      filters.tags = Array.from(selectedTags);
    }

    setIsSearching(true);

    try {
      await dispatch(fetchPublications({ filters, page: currentPage, limit }) as any);
    } catch (error) {
      console.error('Failed to load publications:', error);
    } finally {
      setHasLoadedAtLeastOnce(true);
      setIsSearching(false);
    }
  }, [dispatch, searchQuery, selectedCategories, selectedSubcategories, selectedTags, currentPage, limit]);

  useEffect(() => {
    void loadPublications();
  }, [loadPublications]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    const primarySearchKey = searchParamKeys[0] || 'search';

    if (searchQuery.trim()) params.set(primarySearchKey, searchQuery.trim());
    if (selectedCategories.size > 0) {
      Array.from(selectedCategories).forEach(catId => params.append('categoryId', catId));
    }
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

    router.push(`${basePath}?${params.toString()}`);
    void loadPublications();
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const subcategoryOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; parentIds: Set<string> }>();

    categories.forEach((category) => {
      category.subcategories?.forEach((subcat) => {
        if (!subcat?.id) {
          return;
        }
        if (!seen.has(subcat.id)) {
          seen.set(subcat.id, {
            id: subcat.id,
            name: subcat.name,
            parentIds: new Set(category.id ? [category.id] : []),
          });
        } else if (category.id) {
          seen.get(subcat.id)?.parentIds.add(category.id);
        }
      });
    });

    const selectedIds = Array.from(selectedCategories);
    const filtered = selectedIds.length === 0
      ? Array.from(seen.values())
      : Array.from(seen.values()).filter((entry) =>
          entry.parentIds.size === 0 || selectedIds.some((catId) => entry.parentIds.has(catId))
        );

    return filtered.map(({ id, name }) => ({ id, name }));
  }, [categories, selectedCategories]);

  useEffect(() => {
    setSelectedSubcategories((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const validIds = new Set(subcategoryOptions.map((option) => option.id));
      const updated = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return updated.size === prev.size ? prev : updated;
    });
  }, [subcategoryOptions]);

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
    setSelectedCategories(new Set());
    setSelectedSubcategories(new Set());
    setSelectedTags(new Set());
    setAuthor('');
    setCreator('');
    setYearFrom('');
    setYearTo('');
    setPublicationDate('');
    setSource('');
    setDivision('');
    router.push(basePath);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${basePath}?${params.toString()}`);
  };

  const totalPages = pagination?.totalPages || 1;
  const hasActiveSearch = Boolean(
    (searchQuery || '').trim() ||
    searchParamKeys.some((key) => Boolean(searchParams.get(key)))
  );
  const shouldShowSkeleton = loading || isSearching || (!hasLoadedAtLeastOnce && hasActiveSearch);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="container mx-auto px-6 md:px-16 lg:px-24 xl:px-32 py-4">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-au-corporate-green mb-1">
            {pageTitle}
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
          {(categories.length > 0 || tags.length > 0) && (
            <div className="flex flex-wrap items-start gap-3 pb-3 border-gray-200">
              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-au-grey-text uppercase whitespace-nowrap">Categories:</span>
                  {categories.slice(0, 6).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                        selectedCategories.has(category.id)
                          ? 'bg-au-corporate-green text-white'
                          : 'bg-gray-100 text-au-grey-text hover:bg-gray-200'
                      )}
                    >
                      {category.name}
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
            (categories.length > 0 || tags.length > 0) ? "border-gray-200 mt-3" : "mt-0"
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
                {/* All Categories Grid */}
                <div>
                  <h3 className="text-xs font-semibold text-au-grey-text mb-1.5 uppercase tracking-wide">All Categories</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="w-3.5 h-3.5 text-au-corporate-green border-gray-300 rounded focus:ring-au-corporate-green"
                        />
                        <span className="text-xs text-au-grey-text">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

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
                  {(searchQuery || selectedCategories.size > 0 || selectedSubcategories.size > 0 || selectedTags.size > 0 || author || creator || yearFrom || yearTo || publicationDate || source || division) && (
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
                    // Auto-detect variant from image/video dimensions
                    // Cards will calculate variant based on aspect ratio and update dynamically
                    // We use a default row-span that will be updated when dimensions are detected
                    // For now, we'll let cards size themselves naturally within the grid
                    const defaultRowSpan = 'row-span-6'; // Default to medium size
                    
                    return (
                      <div key={publication.id} className={defaultRowSpan}>
                        <PublicationCard publication={publication} />
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
                <p className="text-au-grey-text/70 text-lg mb-4">No publications found</p>
                {(searchQuery || selectedCategories.size > 0 || selectedSubcategories.size > 0 || selectedTags.size > 0 || author || creator || yearFrom || yearTo || publicationDate || source || division) && (
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

