'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Tag, CheckCircle2, FileText, X, Image as ImageIcon, FolderOpen, Copy } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { showSuccess, showError } from '@/utils/errorHandler';
import { apiClient } from '@/utils/apiClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from './RichTextEditor';
import FilePickerModal from './FilePickerModal';
import { FileWithUrls } from '@/types/fileManager';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

interface PublicationWizardProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'admin' | 'public';
}

export default function PublicationWizard({ onSuccess, onCancel, mode = 'admin' }: PublicationWizardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Basic Information
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isSubcategoriesDropdownOpen, setIsSubcategoriesDropdownOpen] = useState(false);
  const subcategoriesDropdownRef = useRef<HTMLDivElement>(null);

  // Step 2: Media & Content
  const [coverFile, setCoverFile] = useState<FileWithUrls | null>(null);
  const [attachmentFileIds, setAttachmentFileIds] = useState<string[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<FileWithUrls[]>([]);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Step 3: Description
  const [description, setDescription] = useState('');

  // Step 4: Settings & Publishing
  const [status, setStatus] = useState<'draft' | 'pending'>('draft');
  const [publicationDate, setPublicationDate] = useState('');
  const [hasComments, setHasComments] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isLeaderboard, setIsLeaderboard] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  // Generate slug from title
  useEffect(() => {
    if (title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  }, [title, slug]);

  // Load subcategories when category changes
  useEffect(() => {
    if (categoryId) {
      loadCategorySubcategories();
    } else {
      setSubcategories([]);
      setSubcategoryIds([]);
    }
  }, [categoryId]);

  // Close dropdowns on outside click
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


  const loadCategories = async () => {
    try {
      const response = await apiClient.getCategories();
      if (response.success && response.data?.categories) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCategorySubcategories = async () => {
    if (!categoryId) return;
    try {
      const response = await apiClient.getCategorySubcategories(categoryId);
      if (response.success && response.data?.subcategories) {
        setSubcategories(response.data.subcategories);
      }
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    }
  };

  const handleCoverFileSelect = (files: FileWithUrls[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      // Only allow images for cover
      if (!selectedFile.mimeType.startsWith('image/')) {
        showError(t('publications.pleaseSelectImageFile'));
        return;
      }
      setCoverFile(selectedFile);
    } else {
      setCoverFile(null);
    }
  };

  const handleFilePickerSelect = (files: FileWithUrls[]) => {
    setAttachmentFiles(files);
    setAttachmentFileIds(files.map(f => f.id));
  };

  const removeAttachment = (fileId: string) => {
    setAttachmentFiles(prev => prev.filter(f => f.id !== fileId));
    setAttachmentFileIds(prev => prev.filter(id => id !== fileId));
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setSubcategoryIds(prev => {
      if (prev.includes(subcategoryId)) {
        return prev.filter(id => id !== subcategoryId);
      } else {
        return [...prev, subcategoryId];
      }
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) newErrors.title = t('publications.titleRequired');
      if (!slug.trim()) newErrors.slug = t('publications.slugRequired');
      if (!categoryId) newErrors.categoryId = t('publications.categoryRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;

    setIsLoading(true);
    try {
      // Get cover image file path from selected file
      let coverImageUrl: string | undefined = undefined;
      
      if (coverFile) {
        // Use filePath as stored in database (backend expects file path, not download URL)
        coverImageUrl = coverFile.filePath;
      }

      const response = await apiClient.createPublication({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        coverImage: coverImageUrl,
        categoryId,
        subcategoryIds: subcategoryIds.length > 0 ? subcategoryIds : undefined,
        attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
        status,
        publicationDate: publicationDate || undefined,
        hasComments,
        isFeatured,
        isLeaderboard,
      });

      if (response.success) {
        showSuccess(t('publications.publicationCreated'));
        if (onSuccess) {
          onSuccess();
        } else if (mode === 'admin') {
          router.push('/admin/publications');
        } else {
          router.push('/publications');
        }
      } else {
        showError(response.error?.message || t('publications.failedToCreatePublication'));
      }
    } catch (error) {
      showError(t('publications.failedToCreatePublication'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (mode === 'admin') {
      router.push('/admin/publications');
    }
  };

  return (
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
        {/* Header */}
          <div className="mb-4 md:mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text">{t('publications.createPublication')}</h1>
                <p className="text-xs md:text-sm text-au-grey-text/70 mt-1">
                  {currentStep === 1 && t('publications.step1')}
                  {currentStep === 2 && t('publications.step2')}
                  {currentStep === 3 && t('publications.step3')}
                  {currentStep === 4 && t('publications.step4')}
                </p>
              </div>
              {mode === 'admin' && (
                <Link
                  href="/admin/publications"
                  className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto"
                >
                  {t('common.cancel')}
                </Link>
              )}
            </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-medium transition-colors text-xs md:text-base",
                      currentStep >= step
                        ? "bg-au-corporate-green text-white"
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {currentStep > step ? <CheckCircle2 size={16} className="md:w-5 md:h-5" /> : step}
                    </div>
                    <span className={cn(
                      "text-[10px] md:text-xs mt-1 md:mt-2 text-center px-1",
                      currentStep >= step ? "text-au-corporate-green font-medium" : "text-gray-500"
                    )}>
                      <span className="hidden md:inline">
                        {step === 1 && t('publications.basicInformation')}
                        {step === 2 && t('publications.mediaContent')}
                        {step === 3 && t('publications.description')}
                        {step === 4 && t('publications.settingsPublishing')}
                      </span>
                      <span className="md:hidden">{step}</span>
                    </span>
                  </div>
                  {step < 4 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-1 md:mx-2 transition-colors",
                      currentStep > step ? "bg-au-corporate-green" : "bg-gray-200"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 lg:p-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.title')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('publications.enterTitle')}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors",
                    errors.title ? "border-red-500" : "border-gray-300"
                  )}
                  disabled={isLoading}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.slug')} *
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t('publications.enterSlug')}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors",
                    errors.slug ? "border-red-500" : "border-gray-300"
                  )}
                  disabled={isLoading}
                />
                {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.category')} *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors",
                    errors.categoryId ? "border-red-500" : "border-gray-300"
                  )}
                  disabled={isLoading}
                >
                  <option value="">{t('publications.selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
              </div>

              {categoryId && subcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    {t('publications.subcategories')}
                  </label>
                  <div className="relative" ref={subcategoriesDropdownRef}>
                    <div
                      onClick={() => setIsSubcategoriesDropdownOpen(!isSubcategoriesDropdownOpen)}
                      className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-2 items-center cursor-pointer focus-within:ring-2 focus-within:ring-au-gold focus-within:border-au-gold"
                    >
                      {subcategoryIds.length > 0 ? (
                        subcategories
                          .filter(sub => subcategoryIds.includes(sub.id))
                          .map(sub => (
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
                                  toggleSubcategory(sub.id);
                                }}
                                className="hover:text-red-600"
                                disabled={isLoading}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))
                      ) : (
                        <span className="text-gray-400 text-sm">{t('publications.selectSubcategories')}</span>
                      )}
                      <ChevronRight 
                        className={cn(
                          "ml-auto h-4 w-4 text-gray-400 transition-transform",
                          isSubcategoriesDropdownOpen && "rotate-90"
                        )} 
                      />
                    </div>

                    {isSubcategoriesDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {subcategories.map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => toggleSubcategory(sub.id)}
                            className={cn(
                              "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2",
                              subcategoryIds.includes(sub.id) && "bg-au-gold/5"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={subcategoryIds.includes(sub.id)}
                              onChange={() => {}}
                              className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                              disabled={isLoading}
                            />
                            <Tag size={14} className="text-gray-400" />
                            <span>{sub.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Media & Content */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.coverImage')}
                </label>
                {coverFile ? (
                  <div className="relative">
                    <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={coverFile.downloadUrl || coverFile.thumbnailUrl || coverFile.filePath}
                        alt={t('publications.coverImagePreview')}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCoverFile(null)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      disabled={isLoading}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCoverPickerOpen(true)}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-au-gold transition-colors"
                    disabled={isLoading}
                  >
                    <ImageIcon size={24} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">{t('publications.selectImageOrVideo')}</p>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.attachments')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsFilePickerOpen(true)}
                  className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-au-gold transition-colors bg-white"
                  disabled={isLoading}
                >
                  <FolderOpen size={20} className="text-gray-400 mb-1" />
                  <p className="text-xs text-gray-600">{t('publications.selectAttachments')}</p>
                  {attachmentFiles.length > 0 && (
                    <p className="text-xs text-au-grey-text/70 mt-1">
                      {attachmentFiles.length} {attachmentFiles.length === 1 ? 'file' : 'files'} selected
                    </p>
                  )}
                </button>
                {attachmentFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachmentFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm">
                        <span className="text-au-grey-text truncate flex-1">{file.originalName}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.id)}
                          className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                          disabled={isLoading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Step 3: Description */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.description')}
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={t('publications.enterDescription')}
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-au-grey-text">
                    {t('publications.metaTitle')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setMetaTitle(title.trim())}
                    disabled={!title.trim() || isLoading}
                    className="px-2 py-1 text-xs text-au-grey-text/70 hover:text-au-corporate-green border border-gray-300 rounded hover:border-au-corporate-green transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('publications.useForMetaTitle')}
                  >
                    <Copy size={12} />
                    <span>{t('publications.useForMeta')}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={t('publications.enterMetaTitle')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-au-grey-text">
                    {t('publications.metaDescription')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      // Extract plain text from HTML description
                      const tempDiv = document.createElement('div');
                      tempDiv.innerHTML = description;
                      const plainText = tempDiv.textContent || tempDiv.innerText || '';
                      setMetaDescription(plainText.trim());
                    }}
                    disabled={!description.trim() || isLoading}
                    className="px-2 py-1 text-xs text-au-grey-text/70 hover:text-au-corporate-green border border-gray-300 rounded hover:border-au-corporate-green transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('publications.useForMetaDescription')}
                  >
                    <Copy size={12} />
                    <span>{t('publications.useForMeta')}</span>
                  </button>
                </div>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={t('publications.enterMetaDescription')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors resize-none"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Step 4: Settings & Publishing */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.status')}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'pending')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                  disabled={isLoading}
                >
                  <option value="draft">{t('nav.draftPublications')}</option>
                  <option value="pending">{t('nav.pendingPublications')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.publicationDate')}
                </label>
                <input
                  type="datetime-local"
                  value={publicationDate}
                  onChange={(e) => setPublicationDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasComments}
                    onChange={(e) => setHasComments(e.target.checked)}
                    className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-au-grey-text">{t('publications.hasComments')}</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-au-grey-text">{t('publications.isFeatured')}</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLeaderboard}
                    onChange={(e) => setIsLeaderboard(e.target.checked)}
                    className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-au-grey-text">{t('publications.isLeaderboard')}</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 md:mt-8">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
          >
            {t('common.cancel')}
          </button>

          <div className="flex items-center justify-end gap-2 md:gap-3 order-1 sm:order-2">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                disabled={isLoading}
                className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 md:space-x-2"
              >
                <ChevronLeft size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">{t('publications.previous')}</span>
                <span className="sm:hidden">Prev</span>
              </button>
            )}

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-au-corporate-green rounded-lg hover:bg-au-corporate-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 md:space-x-2"
              >
                <span className="hidden sm:inline">{t('publications.next')}</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight size={14} className="md:w-4 md:h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-au-corporate-green rounded-lg hover:bg-au-corporate-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 md:space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('publications.create')}</span>
                    <CheckCircle2 size={14} className="md:w-4 md:h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File Picker Modal for Attachments */}
      <FilePickerModal
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelectFiles={handleFilePickerSelect}
        selectedFiles={attachmentFiles}
        multiple={true}
        title={t('publications.selectAttachments')}
      />

      {/* File Picker Modal for Cover Image */}
      <FilePickerModal
        isOpen={isCoverPickerOpen}
        onClose={() => setIsCoverPickerOpen(false)}
        onSelectFiles={handleCoverFileSelect}
        selectedFiles={coverFile ? [coverFile] : []}
        multiple={false}
        filterMimeTypes={['image/*']}
        title={t('publications.coverImage')}
        description={t('publications.selectImageOrVideo')}
      />
    </div>
  );
}
