'use client';

import { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { showSuccess } from '@/utils/errorHandler';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SubcategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; slug: string; description?: string }) => Promise<void>;
  subcategory?: Subcategory | null;
  className?: string;
}

export default function SubcategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  subcategory,
  className
}: SubcategoryFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  const isEditMode = !!subcategory;

  useEffect(() => {
    if (subcategory) {
      setName(subcategory.name);
      setSlug(subcategory.slug);
      setDescription(subcategory.description || '');
    } else {
      setName('');
      setSlug('');
      setDescription('');
    }
    setError(null);
    setSlugError(null);
  }, [subcategory, isOpen]);

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name if not in edit mode or if slug is empty
    if (!isEditMode || !slug) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    const slugPattern = /^[a-z0-9-]+$/;
    setSlug(value);
    
    if (value && !slugPattern.test(value)) {
      setSlugError(t('errors.categorySlugInvalid'));
    } else {
      setSlugError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(t('errors.categoryNameRequired'));
      return;
    }

    if (!slug.trim()) {
      setError(t('errors.categorySlugRequired'));
      return;
    }

    if (slugError) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      });
      
      if (isEditMode) {
        showSuccess(t('subcategories.subcategoryUpdated'));
      } else {
        showSuccess(t('subcategories.subcategoryCreated'));
      }
      
      setName('');
      setSlug('');
      setDescription('');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 
        (isEditMode ? t('errors.failedToUpdateSubcategory') : t('errors.failedToCreateSubcategory'));
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSlug('');
    setDescription('');
    setError(null);
    setSlugError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col',
        className
      )}>
        {/* Header - Fixed */}
        <div className="flex items-center justify-between mb-6 p-6 pb-0 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-au-gold/20 rounded-lg flex items-center justify-center">
              <Tag size={20} className="text-au-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-au-grey-text">
                {isEditMode ? t('subcategories.editSubcategory') : t('subcategories.createSubcategory')}
              </h2>
              <p className="text-sm text-au-grey-text/70">
                {isEditMode ? t('subcategories.updateSubcategoryInfo') : t('subcategories.createNewSubcategoryInfo')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form id="subcategory-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="subcategory-name" className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('subcategories.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="subcategory-name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('subcategories.enterName')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                  disabled={isLoading}
                  required
                />
                <p className="mt-1 text-xs text-au-grey-text/70">{t('subcategories.nameHelper')}</p>
              </div>

              {/* Slug Field */}
              <div>
                <label htmlFor="subcategory-slug" className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('subcategories.slug')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="subcategory-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={t('subcategories.enterSlug')}
                  className={cn(
                    'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors',
                    slugError ? 'border-red-300' : 'border-gray-300'
                  )}
                  disabled={isLoading}
                  required
                />
                {slugError && (
                  <p className="mt-1 text-xs text-red-600">{slugError}</p>
                )}
                {!slugError && (
                  <p className="mt-1 text-xs text-au-grey-text/70">{t('subcategories.slugHelper')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description Field - Full Width */}
          <div>
            <label htmlFor="subcategory-description" className="block text-sm font-medium text-au-grey-text mb-1">
              {t('subcategories.description')}
            </label>
            <textarea
              id="subcategory-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('subcategories.enterDescription')}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors resize-none"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-au-grey-text/70">{t('subcategories.descriptionHelper')}</p>
          </div>
        </form>

        {/* Actions - Fixed at bottom */}
        <div className="flex items-center justify-end space-x-3 pt-4 px-6 pb-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const form = document.getElementById('subcategory-form') as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={isLoading || !!slugError}
            className="px-4 py-2 text-sm font-medium text-white bg-au-corporate-green rounded-lg hover:bg-au-corporate-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('common.loading')}</span>
              </>
            ) : (
              <span>{t('common.save')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

