'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, FolderOpen, MoreVertical, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { showSuccess } from '@/utils/errorHandler';
import CategoryFormModal from '@/components/CategoryFormModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { cn, getImageUrl } from '@/utils/fileUtils';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  showOnMenu?: boolean;
  menuOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    // Filter categories based on search query
    if (!searchQuery.trim()) {
      setFilteredCategories(categories);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCategories(
        categories.filter(
          (cat) =>
            cat.name.toLowerCase().includes(query) ||
            cat.slug.toLowerCase().includes(query) ||
            (cat.description && cat.description.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, categories]);

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

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCategories();
      
      if (response.success && response.data?.categories) {
        setCategories(response.data.categories);
      } else {
        handleError(new Error(t('errors.failedToLoadCategories')));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; subcategoryIds?: string[] }) => {
    try {
      const response = await apiClient.createCategory(data);
      
      if (response.success && response.data?.category) {
        await loadCategories();
        return;
      } else {
        throw new Error(response.error?.message || t('errors.failedToCreateCategory'));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleEdit = async (data: { name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; subcategoryIds?: string[] }) => {
    if (!selectedCategory) return;

    try {
      const response = await apiClient.updateCategory(selectedCategory.id, data);
      
      if (response.success && response.data?.category) {
        await loadCategories();
        return;
      } else {
        throw new Error(response.error?.message || t('errors.failedToUpdateCategory'));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      const response = await apiClient.deleteCategory(selectedCategory.id);
      
      if (response.success && response.data?.deleted) {
        showSuccess(t('categories.categoryDeleted'));
        await loadCategories();
        setIsDeleteModalOpen(false);
        setSelectedCategory(null);
      } else {
        throw new Error(response.error?.message || t('errors.failedToDeleteCategory'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const toggleActionMenu = (categoryId: string) => {
    setActionMenuOpen(actionMenuOpen === categoryId ? null : categoryId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-au-grey-text">{t('categories.title')}</h1>
            <p className="text-sm text-au-grey-text/70 mt-1">
              {categories.length} {categories.length === 1 ? t('categories.categoryCount') : t('categories.categoryCountPlural')}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            <span>{t('categories.createNew')}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('categories.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
            />
          </div>
        </div>

        {/* Categories Table */}
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-au-grey-text mb-2">
              {searchQuery ? t('categories.noCategoriesFound') : t('categories.noCategories')}
            </h3>
            <p className="text-sm text-au-grey-text/70 mb-6">
              {searchQuery 
                ? t('categories.tryAdjustingSearch')
                : t('categories.noCategoriesDescription')
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
              >
                <Plus size={20} />
                <span>{t('categories.createNew')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-2 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-au-grey-text">
                <div className="col-span-1"></div>
                <div className="col-span-4">{t('categories.name')}</div>
                <div className="col-span-2">{t('categories.slug')}</div>
                <div className="col-span-1 text-center">{t('categories.menu')}</div>
                <div className="col-span-1 text-center">{t('categories.order')}</div>
                <div className="col-span-1">{t('categories.createdAt')}</div>
                <div className="col-span-2">{t('categories.actions')}</div>
              </div>
            </div>

            {/* Table Body - Compact Rows */}
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {filteredCategories.map((category) => (
                <div 
                  key={category.id} 
                  className="px-6 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      {category.coverImage ? (
                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          <img 
                            src={getImageUrl(category.coverImage)}
                            alt={category.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '';
                                const iconDiv = document.createElement('div');
                                iconDiv.className = 'w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center';
                                parent.appendChild(iconDiv);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FolderOpen size={14} className="text-au-grey-text/40" />
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 flex items-center space-x-2 min-w-0">
                      <button 
                        className="text-xs font-medium text-au-grey-text truncate hover:text-au-green text-left"
                        onClick={() => openEditModal(category)}
                        title={category.name}
                      >
                        {category.name}
                      </button>
                    </div>
                    <div className="col-span-2 text-xs text-au-grey-text/70 font-mono truncate" title={category.slug}>
                      {category.slug}
                    </div>
                    <div className="col-span-1 text-center">
                      {category.showOnMenu !== false ? (
                        <span className="text-xs text-green-600 font-medium">{t('categories.yes')}</span>
                      ) : (
                        <span className="text-xs text-gray-400">{t('categories.no')}</span>
                      )}
                    </div>
                    <div className="col-span-1 text-center text-xs text-au-grey-text/70">
                      {category.menuOrder || 0}
                    </div>
                    <div className="col-span-1 text-xs text-au-grey-text/70">
                      {formatDate(category.createdAt)}
                    </div>
                    <div className="col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(category)}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <div className="relative" ref={(el) => {
                        if (el) menuRefs.current.set(category.id, el);
                      }}>
                        <button
                          onClick={() => toggleActionMenu(category.id)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          <MoreVertical size={12} className="text-gray-400" />
                        </button>
                        {actionMenuOpen === category.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => openDeleteModal(category)}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 size={14} />
                              <span>{t('common.delete')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Modal */}
        <CategoryFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreate}
        />

        {/* Edit Modal */}
        <CategoryFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCategory(null);
          }}
          onSubmit={handleEdit}
          category={selectedCategory}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedCategory(null);
          }}
          onConfirm={handleDelete}
          count={1}
          title={t('categories.deleteCategory')}
          message={t('categories.confirmDeleteDescription')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
        />
      </div>
    </div>
  );
}
