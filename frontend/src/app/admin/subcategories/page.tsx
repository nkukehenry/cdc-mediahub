'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Tag, MoreVertical } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { showSuccess } from '@/utils/errorHandler';
import SubcategoryFormModal from '@/components/SubcategoryFormModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SubcategoriesPage() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadSubcategories();
  }, []);

  useEffect(() => {
    // Filter subcategories based on search query
    if (!searchQuery.trim()) {
      setFilteredSubcategories(subcategories);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSubcategories(
        subcategories.filter(
          (sub) =>
            sub.name.toLowerCase().includes(query) ||
            sub.slug.toLowerCase().includes(query) ||
            (sub.description && sub.description.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, subcategories]);

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

  const loadSubcategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSubcategories();
      
      if (response.success && response.data?.subcategories) {
        setSubcategories(response.data.subcategories);
      } else {
        handleError(new Error(t('errors.failedToLoadSubcategories')));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; slug: string; description?: string }) => {
    try {
      const response = await apiClient.createSubcategory({
        ...data,
        description: data.description && data.description.trim().length > 0 ? data.description : data.name,
      });
      
      if (response.success && response.data?.subcategory) {
        await loadSubcategories();
        return;
      } else {
        throw new Error(response.error?.message || t('errors.failedToCreateSubcategory'));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleEdit = async (data: { name: string; slug: string; description?: string }) => {
    if (!selectedSubcategory) return;

    try {
      const response = await apiClient.updateSubcategory(selectedSubcategory.id, {
        ...data,
        description: data.description && data.description.trim().length > 0 ? data.description : data.name,
      });
      
      if (response.success && response.data?.subcategory) {
        await loadSubcategories();
        return;
      } else {
        throw new Error(response.error?.message || t('errors.failedToUpdateSubcategory'));
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!selectedSubcategory) return;

    try {
      const response = await apiClient.deleteSubcategory(selectedSubcategory.id);
      
      if (response.success && response.data?.deleted) {
        showSuccess(t('subcategories.subcategoryDeleted'));
        await loadSubcategories();
        setIsDeleteModalOpen(false);
        setSelectedSubcategory(null);
      } else {
        throw new Error(response.error?.message || t('errors.failedToDeleteSubcategory'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const openEditModal = (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory);
    setIsEditModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const toggleActionMenu = (subcategoryId: string) => {
    setActionMenuOpen(actionMenuOpen === subcategoryId ? null : subcategoryId);
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
            <h1 className="text-2xl font-semibold text-au-grey-text">{t('subcategories.title')}</h1>
            <p className="text-sm text-au-grey-text/70 mt-1">
              {subcategories.length} {subcategories.length === 1 ? t('subcategories.subcategoryCount') : t('subcategories.subcategoryCountPlural')}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            <span>{t('subcategories.createNew')}</span>
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
              placeholder={t('subcategories.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
            />
          </div>
        </div>

        {/* Subcategories Table */}
        {filteredSubcategories.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Tag className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-au-grey-text mb-2">
              {searchQuery ? t('subcategories.noSubcategoriesFound') : t('subcategories.noSubcategories')}
            </h3>
            <p className="text-sm text-au-grey-text/70 mb-6">
              {searchQuery 
                ? t('subcategories.tryAdjustingSearch')
                : t('subcategories.noSubcategoriesDescription')
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
              >
                <Plus size={20} />
                <span>{t('subcategories.createNew')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-2 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-au-grey-text">
                <div className="col-span-1"></div>
                <div className="col-span-4">{t('subcategories.name')}</div>
                <div className="col-span-3">{t('subcategories.slug')}</div>
                <div className="col-span-2">{t('subcategories.createdAt')}</div>
                <div className="col-span-2">{t('subcategories.actions')}</div>
              </div>
            </div>

            {/* Table Body - Compact Rows */}
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {filteredSubcategories.map((subcategory) => (
                <div 
                  key={subcategory.id} 
                  className="px-6 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Tag size={14} className="text-au-grey-text/40" />
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center space-x-2 min-w-0">
                      <button 
                        className="text-xs font-medium text-au-grey-text truncate hover:text-au-green text-left"
                        onClick={() => openEditModal(subcategory)}
                        title={subcategory.name}
                      >
                        {subcategory.name}
                      </button>
                    </div>
                    <div className="col-span-3 text-xs text-au-grey-text/70 font-mono truncate" title={subcategory.slug}>
                      {subcategory.slug}
                    </div>
                    <div className="col-span-2 text-xs text-au-grey-text/70">
                      {formatDate(subcategory.createdAt)}
                    </div>
                    <div className="col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(subcategory)}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <div className="relative" ref={(el) => {
                        if (el) menuRefs.current.set(subcategory.id, el);
                      }}>
                        <button
                          onClick={() => toggleActionMenu(subcategory.id)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          <MoreVertical size={12} className="text-gray-400" />
                        </button>
                        {actionMenuOpen === subcategory.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => openDeleteModal(subcategory)}
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
        <SubcategoryFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreate}
        />

        {/* Edit Modal */}
        <SubcategoryFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedSubcategory(null);
          }}
          onSubmit={handleEdit}
          subcategory={selectedSubcategory}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedSubcategory(null);
          }}
          onConfirm={handleDelete}
          count={1}
          title={t('subcategories.deleteSubcategory')}
          message={t('subcategories.confirmDeleteDescription')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
        />
      </div>
    </div>
  );
}

