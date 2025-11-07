'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FolderOpen, Image as ImageIcon, Upload, Tag, ChevronDown } from 'lucide-react';
import { cn, getImageUrl } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { showSuccess } from '@/utils/errorHandler';
import { apiClient } from '@/utils/apiClient';

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

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; subcategoryIds?: string[] }) => Promise<void>;
  category?: Category | null;
  className?: string;
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  className
}: CategoryFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showOnMenu, setShowOnMenu] = useState(true);
  const [menuOrder, setMenuOrder] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [allSubcategories, setAllSubcategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [isSubcategoriesDropdownOpen, setIsSubcategoriesDropdownOpen] = useState(false);
  const subcategoriesDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!category;

  // Initialize form fields when category changes
  useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description || '');
      setCoverImage(category.coverImage || null);
      setCoverImageFile(null);
      setImagePreview(null);
      setShowOnMenu(category.showOnMenu !== undefined ? category.showOnMenu : true);
      setMenuOrder(category.menuOrder !== undefined ? category.menuOrder : 0);
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setCoverImage(null);
      setCoverImageFile(null);
      setImagePreview(null);
      setShowOnMenu(true);
      setMenuOrder(0);
    }
    setError(null);
    setSlugError(null);
  }, [category, isOpen]);

  // Load all subcategories on mount
  useEffect(() => {
    if (isOpen) {
      loadSubcategories();
    }
  }, [isOpen]);

  // Load existing subcategories when editing
  useEffect(() => {
    if (category && isOpen) {
      loadCategorySubcategories();
    } else {
      setSelectedSubcategoryIds([]);
    }
  }, [category, isOpen]);

  const loadSubcategories = async () => {
    try {
      const response = await apiClient.getSubcategories();
      if (response.success && response.data?.subcategories) {
        setAllSubcategories(response.data.subcategories);
      }
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    }
  };

  const loadCategorySubcategories = async () => {
    if (!category) return;
    try {
      const response = await apiClient.getCategorySubcategories(category.id);
      if (response.success && response.data?.subcategories) {
        setSelectedSubcategoryIds(response.data.subcategories.map(s => s.id));
      }
    } catch (error) {
      console.error('Failed to load category subcategories:', error);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subcategoriesDropdownRef.current && !subcategoriesDropdownRef.current.contains(event.target as Node)) {
        setIsSubcategoriesDropdownOpen(false);
      }
    };

    if (isSubcategoriesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSubcategoriesDropdownOpen]);

  // Cleanup preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);


  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('handleImageSelect called', { file, hasFile: !!file });
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File details:', { name: file.name, type: file.type, size: file.size });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      setError(t('categories.pleaseSelectImageFile'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('File too large:', file.size);
      setError(t('categories.imageSizeMustBeLessThan'));
      return;
    }

    // Create preview immediately using blob URL
    setError(null);
    console.log('Current imagePreview state:', imagePreview);
    
    // Revoke old preview URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      console.log('Revoking old preview URL:', imagePreview);
      URL.revokeObjectURL(imagePreview);
    }
    
    const previewUrl = URL.createObjectURL(file);
    console.log('Created new preview URL:', previewUrl);
    setImagePreview(previewUrl);
    console.log('Set imagePreview state to:', previewUrl);

    setIsUploadingImage(true);

    try {
      console.log('Starting image upload...');
      // Upload image
      const response = await apiClient.uploadFile(file);
      console.log('Upload response:', response);
      
      if (response.success && response.data?.file) {
        const filePath = response.data.file.filePath || response.data.file.thumbnailPath;
        console.log('Upload successful, file path:', filePath);
        setCoverImage(filePath);
        setCoverImageFile(file);
        // Revoke and clear preview once uploaded (we'll use the uploaded image URL instead)
        if (previewUrl && previewUrl.startsWith('blob:')) {
          console.log('Revoking preview URL after successful upload:', previewUrl);
          URL.revokeObjectURL(previewUrl);
        }
        setImagePreview(null);
        console.log('Preview cleared after successful upload');
      } else {
        console.log('Upload failed, response:', response);
        throw new Error(response.error?.message || t('categories.failedToUploadImage'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : t('categories.failedToUploadImage');
      setError(errorMessage);
      // Revoke and clear preview on error - use the previewUrl from closure
      if (previewUrl && previewUrl.startsWith('blob:')) {
        console.log('Revoking preview URL on error:', previewUrl);
        URL.revokeObjectURL(previewUrl);
      }
      setImagePreview(null);
      setCoverImageFile(null);
      console.log('Preview cleared on error');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.log('handleImageSelect finished');
    }
  };

  const removeImage = () => {
    // Revoke blob URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setCoverImage(null);
    setCoverImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const toggleSubcategory = (subcategoryId: string) => {
    setSelectedSubcategoryIds(prev => {
      if (prev.includes(subcategoryId)) {
        return prev.filter(id => id !== subcategoryId);
      } else {
        return [...prev, subcategoryId];
      }
    });
  };

  const removeSubcategory = (subcategoryId: string) => {
    setSelectedSubcategoryIds(prev => prev.filter(id => id !== subcategoryId));
  };

  const getSelectedSubcategories = () => {
    return allSubcategories.filter(sub => selectedSubcategoryIds.includes(sub.id));
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
        coverImage: coverImage || undefined,
        showOnMenu,
        menuOrder: menuOrder || 0,
        subcategoryIds: selectedSubcategoryIds,
      });
      
      if (isEditMode) {
        showSuccess(t('categories.categoryUpdated'));
      } else {
        showSuccess(t('categories.categoryCreated'));
      }
      
      setName('');
      setSlug('');
      setDescription('');
      setCoverImage(null);
      setCoverImageFile(null);
      setImagePreview(null);
      setShowOnMenu(true);
      setMenuOrder(0);
      setSelectedSubcategoryIds([]);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 
        (isEditMode ? t('errors.failedToUpdateCategory') : t('errors.failedToCreateCategory'));
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Revoke blob URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setName('');
    setSlug('');
    setDescription('');
    setCoverImage(null);
    setCoverImageFile(null);
    setImagePreview(null);
    setShowOnMenu(true);
    setMenuOrder(0);
    setSelectedSubcategoryIds([]);
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
        'relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col',
        className
      )}>
        {/* Header - Fixed */}
        <div className="flex items-center justify-between mb-6 p-6 pb-0 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-au-gold/20 rounded-lg flex items-center justify-center">
              <FolderOpen size={20} className="text-au-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-au-grey-text">
                {isEditMode ? t('categories.editCategory') : t('categories.createCategory')}
              </h2>
              <p className="text-sm text-au-grey-text/70">
                {isEditMode ? t('categories.updateCategoryInfo') : t('categories.createNewCategoryInfo')}
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
        <form id="category-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Cover Image Upload - Full Width */}
          <div>
            <label className="block text-sm font-medium text-au-grey-text mb-1">
              {t('categories.coverImage')}
            </label>
            {coverImage || imagePreview ? (
              <div className="relative">
                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                  {imagePreview ? (
                    <>
                      <img 
                        src={imagePreview}
                        alt={t('categories.coverPreview')}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="bg-white rounded-lg p-4 flex flex-col items-center space-y-2">
                            <div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-white font-medium">{t('categories.uploadingImage')}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <img 
                      src={getImageUrl(coverImage!)}
                      alt={t('categories.coverPreview')}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
                        }
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                  disabled={isLoading || isUploadingImage}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-au-gold transition-colors bg-gray-50"
              >
                <Upload size={32} className="text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">{t('categories.clickToUploadCoverImage')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('categories.maxFileSize')}</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isLoading || isUploadingImage}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="category-name" className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('categories.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="category-name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('categories.enterName')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                  disabled={isLoading}
                  required
                />
                <p className="mt-1 text-xs text-au-grey-text/70">{t('categories.nameHelper')}</p>
              </div>

              {/* Slug Field */}
              <div>
                <label htmlFor="category-slug" className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('categories.slug')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="category-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={t('categories.enterSlug')}
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
                  <p className="mt-1 text-xs text-au-grey-text/70">{t('categories.slugHelper')}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Show on Menu Field */}
              <div>
                <label className="flex items-center space-x-2 mb-1">
                  <input
                    type="checkbox"
                    checked={showOnMenu}
                    onChange={(e) => setShowOnMenu(e.target.checked)}
                    className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                    disabled={isLoading}
                  />
                  <span className="text-sm font-medium text-au-grey-text">
                    {t('categories.showOnMenu')}
                  </span>
                </label>
                <p className="mt-1 text-xs text-au-grey-text/70 ml-6">{t('categories.showOnMenuHelper')}</p>
              </div>

              {/* Menu Order Field */}
              <div>
                <label htmlFor="category-menu-order" className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('categories.menuOrder')}
                </label>
                <input
                  id="category-menu-order"
                  type="number"
                  value={menuOrder}
                  onChange={(e) => setMenuOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-au-grey-text/70">{t('categories.menuOrderHelper')}</p>
              </div>
            </div>
          </div>

          {/* Subcategories Multi-Select - Full Width */}
          <div>
            <label className="block text-sm font-medium text-au-grey-text mb-1">
              {t('categories.subcategories')}
            </label>
            <div className="relative" ref={subcategoriesDropdownRef}>
              {/* Selected Tags */}
              <div className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-2 items-center cursor-pointer focus-within:ring-2 focus-within:ring-au-gold focus-within:border-au-gold"
                onClick={() => setIsSubcategoriesDropdownOpen(!isSubcategoriesDropdownOpen)}>
                {getSelectedSubcategories().length > 0 ? (
                  getSelectedSubcategories().map(sub => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-au-gold/10 text-au-grey-text rounded-md text-sm"
                    >
                      <Tag size={14} />
                      <span>{sub.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSubcategory(sub.id);
                        }}
                        className="hover:text-red-600"
                        disabled={isLoading}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">{t('categories.selectSubcategories')}</span>
                )}
                <ChevronDown 
                  className={cn(
                    "ml-auto h-4 w-4 text-gray-400 transition-transform",
                    isSubcategoriesDropdownOpen && "rotate-180"
                  )} 
                />
              </div>

              {/* Dropdown */}
              {isSubcategoriesDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {allSubcategories.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      {t('categories.noSubcategoriesAvailable')}
                    </div>
                  ) : (
                    allSubcategories.map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubcategory(sub.id)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2",
                          selectedSubcategoryIds.includes(sub.id) && "bg-au-gold/5"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubcategoryIds.includes(sub.id)}
                          onChange={() => {}}
                          className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                          disabled={isLoading}
                        />
                        <Tag size={14} className="text-gray-400" />
                        <span>{sub.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-au-grey-text/70">{t('categories.subcategoriesHelper')}</p>
          </div>

          {/* Description Field - Full Width */}
          <div>
            <label htmlFor="category-description" className="block text-sm font-medium text-au-grey-text mb-1">
              {t('categories.description')}
            </label>
            <textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('categories.enterDescription')}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors resize-none"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-au-grey-text/70">{t('categories.descriptionHelper')}</p>
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
              const form = document.getElementById('category-form') as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={isLoading || !!slugError || isUploadingImage}
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

