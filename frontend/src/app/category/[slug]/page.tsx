'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import { store, RootState } from '@/store';
import { fetchPublications } from '@/store/publicationsSlice';
import PublicNav from '@/components/PublicNav';
import PublicationCard from '@/components/PublicationCard';
import { Search, X, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { cn } from '@/utils/fileUtils';

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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const limit = 12;

  useEffect(() => {
    loadCategory();
    loadCategories();
    // TODO: Load tags from API when available
    setTags(['AFRICA HEALTH', 'UNGA', 'Head', 'Plants', 'Population', 'Briefing', 'Press', 'Reading', 'Cow', 'Rapid Response', 'Blind', 'CPHIA', 'Cat', 'Kira', 'Naj']);
  }, [categorySlug]);

  useEffect(() => {
    if (currentCategory) {
      loadPublications();
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

  const loadPublications = async () => {
    if (!currentCategory) return;
    
    const filters: any = {
      categoryId: currentCategory.id
    };
    
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (selectedSubcategories.size > 0) {
      filters.subcategoryId = Array.from(selectedSubcategories)[0];
    }

    dispatch(fetchPublications({ filters, page: currentPage, limit }) as any);
  };

  const handleApplyFilters = () => {
    if (!currentCategory) return;
    
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedSubcategories.size > 0) {
      Array.from(selectedSubcategories).forEach(subId => params.append('subcategoryId', subId));
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
    loadPublications();
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

  if (!currentCategory && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-8">
          <div className="text-center py-12">
            <p className="text-au-grey-text/70 text-lg">Category not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      
      <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Toggle Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="w-full bg-white text-au-corporate-green border border-au-corporate-green rounded-lg py-3 px-4 flex items-center justify-center gap-2 font-medium hover:bg-au-corporate-green/5 transition-colors"
            >
              <Filter className="h-5 w-5" />
              {isMobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Left Sidebar - Filters */}
          <aside className={cn(
            "w-full lg:w-80 flex-shrink-0",
            !isMobileFiltersOpen && "hidden lg:block"
          )}>
            <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-24 space-y-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-semibold text-au-grey-text mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search publications..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
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
              </div>

              {/* Subcategories */}
              {currentCategory?.subcategories && currentCategory.subcategories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-au-grey-text mb-3 uppercase tracking-wide">Sub-Categories</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {currentCategory.subcategories.map(subcat => (
                      <label key={subcat.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSubcategories.has(subcat.id)}
                          onChange={() => toggleSubcategory(subcat.id)}
                          className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-corporate-green"
                        />
                        <span className="text-sm text-au-grey-text">{subcat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <h3 className="text-sm font-semibold text-au-grey-text mb-3 uppercase tracking-wide">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                        selectedTags.has(tag)
                          ? "bg-au-corporate-green text-white"
                          : "bg-au-corporate-green/10 text-au-corporate-green hover:bg-au-corporate-green/20"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Publication Details */}
              <div>
                <h3 className="text-sm font-semibold text-au-grey-text mb-3 uppercase tracking-wide">Publication Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-au-grey-text/70 mb-1">Author</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Enter author name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-au-grey-text/70 mb-1">Creator</label>
                    <input
                      type="text"
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                      placeholder="Enter creator name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Year From</label>
                      <input
                        type="text"
                        value={yearFrom}
                        onChange={(e) => setYearFrom(e.target.value)}
                        placeholder="From"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-au-grey-text/70 mb-1">Year To</label>
                      <input
                        type="text"
                        value={yearTo}
                        onChange={(e) => setYearTo(e.target.value)}
                        placeholder="To"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-au-grey-text/70 mb-1">Publication Date</label>
                    <input
                      type="date"
                      value={publicationDate}
                      onChange={(e) => setPublicationDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-au-grey-text/70 mb-1">Source</label>
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="Enter source"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-au-grey-text/70 mb-1">Division</label>
                    <select
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-au-corporate-green focus:border-transparent text-sm"
                    >
                      <option value="">Select Division</option>
                      {/* TODO: Load divisions from API */}
                    </select>
                  </div>
                </div>
              </div>

              {/* Apply Filters Button */}
              <button
                onClick={handleApplyFilters}
                className="w-full bg-au-corporate-green hover:bg-au-corporate-green/90 text-white py-3 rounded-lg font-medium transition-colors uppercase flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" />
                Apply Filters
              </button>

              {/* Clear Filters */}
              {(searchQuery || selectedSubcategories.size > 0 || selectedTags.size > 0 || author || creator || yearFrom || yearTo || publicationDate || source || division) && (
                <button
                  onClick={clearFilters}
                  className="w-full text-sm text-au-grey-text/70 hover:text-au-corporate-green transition-colors underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-au-corporate-green mb-2">
                {currentCategory?.name || 'Loading...'}
              </h1>
              {pagination && (
                <p className="text-sm text-au-grey-text/70">
                  Showing {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, pagination.total)} of {pagination.total} publications
                </p>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg overflow-hidden animate-pulse aspect-[2/1]" />
                ))}
              </div>
            )}

            {/* Publications Grid */}
            {!loading && publications.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 mb-8">
                  {publications.map((publication, index) => (
                    <div
                      key={publication.id}
                      className="animate-fade-in"
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: 'both'
                      }}
                    >
                      <PublicationCard publication={publication} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        currentPage === 1
                          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                          : "bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200"
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
                              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              currentPage === page
                                ? "bg-au-corporate-green text-white"
                                : "bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200"
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
                        "p-2 rounded-lg transition-colors",
                        currentPage === totalPages
                          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                          : "bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200"
                      )}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    {totalPages > 5 && (
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={cn(
                          "p-2 rounded-lg transition-colors ml-2",
                          currentPage === totalPages
                            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                            : "bg-white text-au-grey-text hover:bg-gray-100 border border-gray-200"
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
            {!loading && publications.length === 0 && (
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
      </div>
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

