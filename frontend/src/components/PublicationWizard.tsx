'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Tag, CheckCircle2, FileText, X, Image as ImageIcon, FolderOpen, Copy, FileIcon, Video, Music, Archive, FileSpreadsheet, FileCode, Eye } from 'lucide-react';
import { cn, getImageUrl, PLACEHOLDER_IMAGE_PATH, isImageFile, isVideoFile, isAudioFile, isPdfFile } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { showSuccess, showError } from '@/utils/errorHandler';
import { apiClient } from '@/utils/apiClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from './RichTextEditor';
import FilePickerModal from './FilePickerModal';
import FilePreviewModal from './FilePreviewModal';
import { FileWithUrls } from '@/types/fileManager';
import { useAuth } from '@/hooks/useAuth';

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

interface TagOption {
  id: string;
  name: string;
  slug: string;
  usageCount?: number;
}

interface PublicationWizardProps {
  publicationId?: string; // For edit mode
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: 'admin' | 'public';
}

export default function PublicationWizard({ publicationId, onSuccess, onCancel, mode = 'admin' }: PublicationWizardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPublication, setLoadingPublication] = useState(false);
  const isEditMode = !!publicationId;
  
  // Check if user has permission to update publication status
  const canUpdateStatus = user?.permissions?.includes('posts:edit') || user?.permissions?.includes('posts:update') || false;

  // Step 1: Basic Information
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugDirty, setIsSlugDirty] = useState(false);
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
  const [previewFile, setPreviewFile] = useState<FileWithUrls | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Step 3: Description
  const [description, setDescription] = useState('');

  // Step 4: Settings & Publishing
  const [status, setStatus] = useState<'draft' | 'pending' | 'approved' | 'rejected'>('draft');
  const [saveAsDraft, setSaveAsDraft] = useState(!isEditMode);
  const [publicationDate, setPublicationDate] = useState('');
  const [hasComments, setHasComments] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isLeaderboard, setIsLeaderboard] = useState(false);
  const [existingCoverImage, setExistingCoverImage] = useState<string | null>(null);
  const [schedulePublication, setSchedulePublication] = useState(false);
  const isVideoMimeType = (mimeType?: string) => Boolean(mimeType && mimeType.startsWith('video/'));
  const isImageMimeType = (mimeType?: string) => Boolean(mimeType && mimeType.startsWith('image/'));
  const isVideoPath = (filePath?: string | null) => {
    if (!filePath) return false;
    const normalizedPath = (filePath.split('?')[0] || '').toLowerCase();
    return /\.(mp4|mov|mpe?g|avi|wmv|webm|ogg|ogv)$/.test(normalizedPath);
  };

  const padNumber = (value: number, length: number = 2) => String(value).padStart(length, '0');

  const formatDateTimeForInput = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
  };

  const formatDateTimeForApi = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;

    const milliseconds = padNumber(date.getMilliseconds(), 3);

    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}.${milliseconds}`;
  };

  const coverIsVideo = useMemo(() => {
    if (coverFile) {
      return isVideoMimeType(coverFile.mimeType);
    }
    return isVideoPath(existingCoverImage);
  }, [coverFile, existingCoverImage]);

  const coverPreviewSource = useMemo(() => {
    if (coverFile) {
      if (coverIsVideo) {
        return (
          coverFile.downloadUrl ||
          (coverFile.filePath ? getImageUrl(coverFile.filePath) : undefined) ||
          coverFile.thumbnailUrl ||
          ''
        );
      }
      return (
        (coverFile.filePath ? getImageUrl(coverFile.filePath) : undefined) ||
        coverFile.downloadUrl ||
        coverFile.thumbnailUrl ||
        getImageUrl(PLACEHOLDER_IMAGE_PATH)
      );
    }
    if (existingCoverImage) {
      return getImageUrl(existingCoverImage);
    }
    return getImageUrl(PLACEHOLDER_IMAGE_PATH);
  }, [coverFile, coverIsVideo, existingCoverImage]);

  const coverPreviewMime = coverFile?.mimeType || (coverIsVideo ? 'video/mp4' : 'image/jpeg');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const normalizedSelectedTags = useMemo(() => {
    return new Set(selectedTags.map(tag => tag.toLowerCase()));
  }, [selectedTags]);

  const filteredTagSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    const pool = query
      ? availableTags.filter(tag => tag.name.toLowerCase().includes(query))
      : availableTags;

    return pool
      .filter(tag => !normalizedSelectedTags.has(tag.name.toLowerCase()))
      .slice(0, 8);
  }, [availableTags, normalizedSelectedTags, tagInput]);

  const addTag = useCallback((tagName: string) => {
    const normalized = tagName.trim();
    if (!normalized) {
      return;
    }

    const normalizedLower = normalized.toLowerCase();
    if (normalizedSelectedTags.has(normalizedLower)) {
      showError('Tag already added');
      setTagInput('');
      return;
    }

    setSelectedTags(prev => [...prev, normalized]);
    setTagInput('');

    setAvailableTags(prev => {
      if (prev.some(tag => tag.name.toLowerCase() === normalizedLower)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: normalizedLower,
          name: normalized,
          slug: normalizedLower,
          usageCount: 0
        }
      ];
    });
  }, [normalizedSelectedTags, showError]);

  const removeTag = useCallback((tagName: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagName));
  }, []);

  const handleTagSuggestionClick = useCallback((tagName: string) => {
    addTag(tagName);
  }, [addTag]);

  const handleTagInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    } else if (event.key === 'Backspace' && !tagInput) {
      setSelectedTags(prev => prev.slice(0, -1));
    }
  }, [addTag, tagInput]);

  const stepErrorFields: Record<number, string[]> = {
    1: ['title', 'slug', 'categoryId'],
    2: ['cover', 'attachments']
  };

  const applyFieldErrors = (step: number, fieldErrors: Record<string, string>) => {
    setErrors(prev => {
      const updated = { ...prev };
      const fieldsToClear = stepErrorFields[step] || [];
      fieldsToClear.forEach(field => {
        if (!(field in fieldErrors) && updated[field]) {
          delete updated[field];
        }
      });
      return Object.keys(fieldErrors).length > 0 ? { ...updated, ...fieldErrors } : updated;
    });
  };

  const showFieldErrors = (messages: string[]) => {
    messages.forEach(msg => showError(msg));
  };

  const getStatusLabel = (value: 'draft' | 'pending' | 'approved' | 'rejected') => {
    if (value === 'approved') return t('publications.statusApproved') || 'Approved';
    if (value === 'pending') return t('nav.pendingPublications');
    if (value === 'rejected') return t('publications.statusRejected') || 'Rejected';
    return t('nav.draftPublications');
  };

  const handleSaveAsDraftToggle = (checked: boolean) => {
    setSaveAsDraft(checked);
    setStatus(checked ? 'draft' : 'pending');
  };

  useEffect(() => {
    if (isEditMode) {
      setSaveAsDraft((status || 'draft') === 'draft');
    }
  }, [isEditMode, status]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await apiClient.getTags();
        if (response.success && response.data?.tags) {
          setAvailableTags(response.data.tags as TagOption[]);
        }
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };

    fetchTags();
  }, []);

  // Load publication data when in edit mode
  useEffect(() => {
    if (publicationId) {
      loadPublication();
    }
  }, [publicationId]);

  // Generate slug from title (only in create mode)
  useEffect(() => {
    if (isEditMode) {
      return;
    }

    if (!title) {
      if (!isSlugDirty) {
        setSlug('');
      }
      return;
    }

    if (isSlugDirty) {
      return;
    }

    const generatedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(generatedSlug);
  }, [title, isEditMode, isSlugDirty]);

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

  const loadPublication = async () => {
    if (!publicationId) return;
    
    setLoadingPublication(true);
    try {
      const response = await apiClient.getPublicationById(publicationId);
      if (response.success && response.data?.post) {
        const publication = response.data.post;
        
        // Populate all fields with existing data
        setTitle(publication.title || '');
        setSlug(publication.slug || '');
        setCategoryId(publication.categoryId || '');
        setDescription(publication.description || '');
        setMetaTitle(publication.metaTitle || '');
        setMetaDescription(publication.metaDescription || '');
        setStatus(publication.status || 'draft');
        setSaveAsDraft((publication.status || 'draft') === 'draft');
        const formattedDate = formatDateTimeForInput(publication.publicationDate);
        setPublicationDate(formattedDate);
        setSchedulePublication(Boolean(formattedDate));
        setHasComments(publication.hasComments ?? true);
        setIsFeatured(publication.isFeatured ?? false);
        setIsLeaderboard(publication.isLeaderboard ?? false);
        
        // Handle cover image
        if (publication.coverImage) {
          setExistingCoverImage(publication.coverImage);
          // If coverImage is a path, we'll show it but not set it as coverFile
          // coverFile is only set when user selects a new file
        }
        
        // Handle subcategories
        if (publication.subcategories && Array.isArray(publication.subcategories)) {
          setSubcategoryIds(publication.subcategories.map((sub: any) => sub.id));
        }
        
        // Handle attachments - use attachment data if available, otherwise just IDs
        if (publication.attachments && Array.isArray(publication.attachments) && publication.attachments.length > 0) {
          const attachmentIds = publication.attachments.map((att: any) => att.fileId || att.id || att.file?.id);
          setAttachmentFileIds(attachmentIds.filter(Boolean));
          
          // Try to construct FileWithUrls from attachment data
          const attachmentFiles: FileWithUrls[] = publication.attachments
            .map((att: any) => {
              // If attachment has file object, use it
              if (att.file) {
                return {
                  id: att.file.id || att.fileId || att.id,
                  filename: att.file.filename || att.file.originalName || '',
                  originalName: att.file.originalName || att.file.filename || '',
                  filePath: att.file.filePath || att.file.path || '',
                  thumbnailPath: att.file.thumbnailPath,
                  fileSize: att.file.fileSize || 0,
                  mimeType: att.file.mimeType || '',
                  folderId: att.file.folderId,
                  createdAt: att.file.createdAt || '',
                  updatedAt: att.file.updatedAt || '',
                  downloadUrl: att.file.downloadUrl || '',
                  thumbnailUrl: att.file.thumbnailUrl || null,
                } as FileWithUrls;
              }
              // Otherwise create minimal FileWithUrls from attachment data
              if (att.fileId || att.id) {
                return {
                  id: att.fileId || att.id,
                  filename: att.filename || att.originalName || 'Unknown',
                  originalName: att.originalName || att.filename || 'Unknown',
                  filePath: att.filePath || att.path || '',
                  thumbnailPath: att.thumbnailPath,
                  fileSize: att.fileSize || 0,
                  mimeType: att.mimeType || 'application/octet-stream',
                  folderId: att.folderId,
                  createdAt: att.createdAt || '',
                  updatedAt: att.updatedAt || '',
                  downloadUrl: att.downloadUrl || '',
                  thumbnailUrl: att.thumbnailUrl || null,
                } as FileWithUrls;
              }
              return null;
            })
            .filter((file: FileWithUrls | null): file is FileWithUrls => file !== null);
          
          if (attachmentFiles.length > 0) {
            setAttachmentFiles(attachmentFiles);
          }
        }

        if (publication.tags && Array.isArray(publication.tags)) {
          const tagNames = publication.tags
            .map((tag: any) => typeof tag.name === 'string' ? tag.name.trim() : '')
            .filter((tag: string) => tag.length > 0);
          setSelectedTags(tagNames);
          if (tagNames.length > 0) {
            setAvailableTags(prev => {
              const existing = new Set(prev.map(tag => tag.name.toLowerCase()));
              const additions = tagNames
                .filter((tag: string) => !existing.has(tag.toLowerCase()))
                .map((tag: string) => ({
                  id: tag.toLowerCase(),
                  name: tag,
                  slug: tag.toLowerCase(),
                  usageCount: 0
                }));
              return additions.length > 0 ? [...prev, ...additions] : prev;
            });
          }
        } else {
          setSelectedTags([]);
        }
      } else {
        showError(t('publications.failedToLoadPublication'));
      }
    } catch (error) {
      console.error('Failed to load publication:', error);
      showError(t('publications.failedToLoadPublication'));
    } finally {
      setLoadingPublication(false);
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
      const mimeType = selectedFile.mimeType || '';
      const isImage = isImageMimeType(mimeType);
      const isVideo = isVideoMimeType(mimeType);

      if (!isImage && !isVideo) {
        showError(t('publications.pleaseSelectImageOrVideo'));
        return;
      }
      console.log('Cover file selected:', selectedFile);
      console.log('File path:', selectedFile.filePath);
      console.log('Download URL:', selectedFile.downloadUrl);
      console.log('Thumbnail URL:', selectedFile.thumbnailUrl);
      setCoverFile(selectedFile);
      // Clear existing cover image when new file is selected
      if (isEditMode) {
        setExistingCoverImage(null);
      }
      setErrors(prev => {
        const updated = { ...prev };
        delete updated.cover;
        return updated;
      });

      if (isVideo) {
        setAttachmentFiles(prev => {
          if (prev.some(file => file.id === selectedFile.id)) {
            setAttachmentFileIds(prev.map(file => file.id));
            return prev;
          }
          const updated = [selectedFile, ...prev];
          setAttachmentFileIds(updated.map(file => file.id));
          return updated;
        });
        setErrors(prev => {
          const updated = { ...prev };
          delete updated.attachments;
          return updated;
        });
      }
    } else {
      setCoverFile(null);
    }
  };

  const handleFilePickerSelect = (files: FileWithUrls[]) => {
    console.log('Attachment files selected:', files);

    if (categoryId && files.length > 0) {
      const selectedCategory = categories.find(c => c.id === categoryId);
      if (selectedCategory) {
        const categoryNameLower = selectedCategory.name.toLowerCase();
        const categorySlugLower = selectedCategory.slug.toLowerCase();
        const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
        const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');

        if (isAudioCategory || isVideoCategory) {
          const firstAttachment = files[0];
          const firstAttachmentMatches = (isAudioCategory && firstAttachment.mimeType?.startsWith('audio/')) ||
                                         (isVideoCategory && firstAttachment.mimeType?.startsWith('video/'));

          if (!firstAttachmentMatches) {
            const message = `The first attachment must be a ${isAudioCategory ? 'audio' : 'video'} file for ${isAudioCategory ? 'audio' : 'video'} category publications`;
            setErrors(prev => ({
              ...prev,
              attachments: message
            }));
            showError(message);
            return;
          }
        }
      }
    }

    setAttachmentFiles(files);
    setAttachmentFileIds(files.map(f => f.id));
    console.log('Attachment file IDs set:', files.map(f => f.id));
    console.log('Current attachmentFiles state will be:', files);

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.attachments;
      return newErrors;
    });
  };

  const removeAttachment = (fileId: string) => {
    const updatedFiles = attachmentFiles.filter(f => f.id !== fileId);
    const updatedIds = attachmentFileIds.filter(id => id !== fileId);
    setAttachmentFiles(updatedFiles);
    setAttachmentFileIds(updatedIds);
    
    // Re-validate after removal if category requires attachments
    if (updatedFiles.length === 0) {
      let message = t('publications.attachmentsRequired') || 'Please select at least one attachment.';
      if (categoryId) {
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (selectedCategory) {
          const categoryNameLower = selectedCategory.name.toLowerCase();
          const categorySlugLower = selectedCategory.slug.toLowerCase();
          const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
          const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
          if (isAudioCategory || isVideoCategory) {
            message = `Publications in ${isAudioCategory ? 'audio' : 'video'} categories must have at least one ${isAudioCategory ? 'audio' : 'video'} attachment`;
          }
        }
      }

      setErrors(prev => ({
        ...prev,
        attachments: message
      }));
      showError(message);
      return;
    }

    if (categoryId) {
      const selectedCategory = categories.find(c => c.id === categoryId);
      if (selectedCategory) {
        const categoryNameLower = selectedCategory.name.toLowerCase();
        const categorySlugLower = selectedCategory.slug.toLowerCase();
        const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
        const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
        
        if (isAudioCategory || isVideoCategory) {
          const firstAttachment = updatedFiles[0];
          if (firstAttachment) {
            const firstAttachmentMatches = (isAudioCategory && firstAttachment.mimeType?.startsWith('audio/')) ||
                                           (isVideoCategory && firstAttachment.mimeType?.startsWith('video/'));
            
            if (!firstAttachmentMatches) {
              const message = `The first attachment must be a ${isAudioCategory ? 'audio' : 'video'} file for ${isAudioCategory ? 'audio' : 'video'} category publications`;
              setErrors(prev => ({
                ...prev,
                attachments: message
              }));
              showError(message);
              return;
            } else {
              // Clear error if validation passes
              setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.attachments;
                return newErrors;
              });
            }
          }
        }
      }
    }

    // Clear attachment error if none of the above conditions triggered
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.attachments;
      return newErrors;
    });
  };

  const handleAttachmentPreview = (file: FileWithUrls) => {
    setPreviewFile(file);
    setIsPreviewModalOpen(true);
  };

  // Helper function to get file icon based on mime type
  const getAttachmentIcon = (mimeType: string) => {
    if (isImageFile(mimeType)) return <ImageIcon size={16} className="text-au-green" />;
    if (isVideoFile(mimeType)) return <Video size={16} className="text-au-green" />;
    if (isAudioFile(mimeType)) return <Music size={16} className="text-au-green" />;
    if (isPdfFile(mimeType)) return <FileText size={16} className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document') || 
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword') return <FileText size={16} className="text-blue-500" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel') return <FileSpreadsheet size={16} className="text-green-600" />;
    if (mimeType.includes('text/')) return <FileCode size={16} className="text-gray-600" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return <Archive size={16} className="text-orange-500" />;
    return <FileIcon size={16} className="text-gray-400" />;
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

  // Validate audio/video category requirements
  const validateAudioVideoCategory = () => {
    if (!categoryId) return true;
    
    const selectedCategory = categories.find(c => c.id === categoryId);
    if (!selectedCategory) {
      setErrors(prev => ({
        ...prev,
        attachments: 'Selected category not found'
      }));
      showError('Selected category not found');
      return false;
    }
    
    const categoryNameLower = selectedCategory.name.toLowerCase();
    const categorySlugLower = selectedCategory.slug.toLowerCase();
    const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
    const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
    
    if (isAudioCategory || isVideoCategory) {
      if (attachmentFiles.length === 0) {
        const message = `Publications in ${isAudioCategory ? 'audio' : 'video'} categories must have at least one ${isAudioCategory ? 'audio' : 'video'} attachment`;
        setErrors(prev => ({
          ...prev,
          attachments: message
        }));
        showError(message);
        return false;
      }
      
      // Mandate that the FIRST attachment matches the category type
      const firstAttachment = attachmentFiles[0];
      if (!firstAttachment) {
        const message = `Publications in ${isAudioCategory ? 'audio' : 'video'} categories must have at least one ${isAudioCategory ? 'audio' : 'video'} attachment`;
        setErrors(prev => ({
          ...prev,
          attachments: message
        }));
        showError(message);
        return false;
      }
      
      // Check if the first attachment matches the category type
      const firstAttachmentMatches = (isAudioCategory && firstAttachment.mimeType?.startsWith('audio/')) ||
                                     (isVideoCategory && firstAttachment.mimeType?.startsWith('video/'));
      
      if (!firstAttachmentMatches) {
        const message = `The first attachment must be a ${isAudioCategory ? 'audio' : 'video'} file for ${isAudioCategory ? 'audio' : 'video'} category publications`;
        setErrors(prev => ({
          ...prev,
          attachments: message
        }));
        showError(message);
        return false;
      }
      
      // Also check that at least one attachment matches (for the requirement)
      const hasMatchingAttachment = attachmentFiles.some(file => {
        if (isAudioCategory && file.mimeType?.startsWith('audio/')) {
          return true;
        }
        if (isVideoCategory && file.mimeType?.startsWith('video/')) {
          return true;
        }
        return false;
      });
      
      if (!hasMatchingAttachment) {
        const message = `Publications in ${isAudioCategory ? 'audio' : 'video'} categories must have at least one ${isAudioCategory ? 'audio' : 'video'} attachment`;
        setErrors(prev => ({
          ...prev,
          attachments: message
        }));
        showError(message);
        return false;
      }
    }
    
    return true;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const errorMessages: string[] = [];

    if (step === 1) {
      if (!title.trim()) {
        const message = t('publications.titleRequired');
        newErrors.title = message;
        errorMessages.push(message);
      }
      if (!slug.trim()) {
        const message = t('publications.slugRequired');
        newErrors.slug = message;
        errorMessages.push(message);
      }
      if (!categoryId) {
        const message = t('publications.categoryRequired');
        newErrors.categoryId = message;
        errorMessages.push(message);
      }
    }

    if (step === 2) {
      const hasCover = Boolean(coverFile || existingCoverImage);
      if (!hasCover) {
        const message = t('publications.coverRequired') || 'A cover image is required.';
        newErrors.cover = message;
        errorMessages.push(message);
      }

      if (attachmentFiles.length === 0) {
        const message = t('publications.attachmentsRequired') || 'Please select at least one attachment.';
        newErrors.attachments = message;
        errorMessages.push(message);
      }
    }

    applyFieldErrors(step, newErrors);
    showFieldErrors(errorMessages);

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

    // Validate audio/video category requirements
    if (!validateAudioVideoCategory()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get cover image file path from selected file or use existing
      let coverImageUrl: string | undefined = undefined;
      
      if (coverFile) {
        // Use filePath as stored in database (backend expects file path, not download URL)
        coverImageUrl = coverFile.filePath;
      } else if (existingCoverImage && isEditMode) {
        // Keep existing cover image if no new one selected
        coverImageUrl = existingCoverImage;
      }

      const formattedPublicationDate = schedulePublication ? formatDateTimeForApi(publicationDate) : undefined;

      if (isEditMode && publicationId) {
        // Update existing publication
        const submissionStatus = saveAsDraft ? 'draft' : 'pending';
        setStatus(submissionStatus);

        const response = await apiClient.updatePublication(publicationId, {
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          metaTitle: metaTitle.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          coverImage: coverImageUrl,
          categoryId,
          subcategoryIds: subcategoryIds.length > 0 ? subcategoryIds : undefined,
          attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
          status: submissionStatus,
          publicationDate: formattedPublicationDate,
          hasComments,
          isFeatured,
          isLeaderboard,
          tags: selectedTags,
        });

        if (response.success) {
          showSuccess(t('publications.publicationUpdated') || 'Publication updated successfully');
          if (onSuccess) {
            onSuccess();
          } else if (mode === 'admin') {
            router.push('/admin/publications');
          } else {
            router.push('/publications');
          }
        } else {
          // Use the exact error message from the server, no localization
          const errorMessage = response.error?.message || 'Failed to update publication';
          console.error('Update publication failed:', response.error);
          showError(errorMessage);
        }
      } else {
        // Create new publication
        const submissionStatus = 'draft';
        setStatus(submissionStatus);

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
          status: submissionStatus,
          publicationDate: formattedPublicationDate,
          hasComments,
          isFeatured,
          isLeaderboard,
          tags: selectedTags,
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
          // Use the exact error message from the server, no localization
          const errorMessage = response.error?.message || 'Failed to create publication';
          console.error('Create publication failed:', response.error);
          showError(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Publication operation error:', error);
      console.error('Error structure:', {
        message: error?.message,
        error: error?.error,
        errorMessage: error?.error?.message,
        string: typeof error === 'string' ? error : 'not a string'
      });
      
      // Extract error message from various error formats - prioritize server message
      // When API client throws, it uses: throw new Error(data.error?.message || ...)
      // So error.message should contain the server's error message
      let errorMessage = '';
      
      // Priority 1: Direct message property (from thrown Error with server message)
      if (error?.message) {
        errorMessage = error.message;
      } 
      // Priority 2: Nested error object with message
      else if (error?.error?.message) {
        errorMessage = error.error.message;
      } 
      // Priority 3: String error
      else if (typeof error === 'string') {
        errorMessage = error;
      } 
      // Fallback (should rarely happen)
      else {
        errorMessage = isEditMode 
          ? 'Failed to update publication'
          : 'Failed to create publication';
      }
      
      console.log('Extracted error message for toast:', errorMessage);
      // Always show the exact server message, no localization
      showError(errorMessage);
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

  // Show loading state while fetching publication data
  if (loadingPublication) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-au-grey-text">{t('common.loading')}...</div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
        {/* Header */}
          <div className="mb-4 md:mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text">
                  {isEditMode ? (t('publications.editPublication') || 'Edit Publication') : t('publications.createPublication')}
                </h1>
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
                  onChange={(e) => {
                    const newSlug = e.target.value;
                    setSlug(newSlug);
                    setIsSlugDirty(newSlug.trim().length > 0);
                  }}
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
                  onChange={(e) => {
                    const newCategoryId = e.target.value;
                    setCategoryId(newCategoryId);
                    
                    // Validate attachments when category changes
                    if (newCategoryId && attachmentFiles.length > 0) {
                      const selectedCategory = categories.find(c => c.id === newCategoryId);
                      if (selectedCategory) {
                        const categoryNameLower = selectedCategory.name.toLowerCase();
                        const categorySlugLower = selectedCategory.slug.toLowerCase();
                        const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
                        const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
                        
                        if (isAudioCategory || isVideoCategory) {
                          const firstAttachment = attachmentFiles[0];
                          if (firstAttachment) {
                            const firstAttachmentMatches = (isAudioCategory && firstAttachment.mimeType?.startsWith('audio/')) ||
                                                           (isVideoCategory && firstAttachment.mimeType?.startsWith('video/'));
                            
                            if (!firstAttachmentMatches) {
                              setErrors(prev => ({
                                ...prev,
                                attachments: `The first attachment must be a ${isAudioCategory ? 'audio' : 'video'} file for ${isAudioCategory ? 'audio' : 'video'} category publications`
                              }));
                            } else {
                              // Clear error if validation passes
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.attachments;
                                return newErrors;
                              });
                            }
                          }
                        } else {
                          // Clear attachment errors for non-audio/video categories
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.attachments;
                            return newErrors;
                          });
                        }
                      }
                    }
                  }}
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
                {coverFile || existingCoverImage ? (
                  <div className="relative">
                    <div className={`w-full ${coverIsVideo ? 'h-96 md:h-[28rem]' : 'h-64'} bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center transition-all duration-300`}>
                      {coverIsVideo ? (
                        coverPreviewSource ? (
                          <video
                            key={coverFile?.id || existingCoverImage || 'cover-preview-video'}
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                          >
                            <source src={coverPreviewSource} type={coverPreviewMime} />
                            {t('publications.videoPreviewNotSupported') || 'Video preview not supported.'}
                          </video>
                        ) : (
                          <div className="text-sm text-gray-500">{t('publications.videoPreviewNotAvailable') || 'Video preview not available.'}</div>
                        )
                      ) : (
                        <img
                          key={coverFile?.id || existingCoverImage || 'cover-preview'}
                          src={coverPreviewSource}
                          alt={t('publications.coverImagePreview')}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes(PLACEHOLDER_IMAGE_PATH)) {
                              target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                            }
                          }}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        if (isEditMode) {
                          setExistingCoverImage(null);
                        }
                      }}
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
                {errors.cover && (
                  <p className="text-xs text-red-500 mt-2">{errors.cover}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.attachments')}
                  {(() => {
                    const selectedCategory = categories.find(c => c.id === categoryId);
                    if (selectedCategory) {
                      const categoryNameLower = selectedCategory.name.toLowerCase();
                      const categorySlugLower = selectedCategory.slug.toLowerCase();
                      const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
                      const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
                      if (isAudioCategory || isVideoCategory) {
                        return <span className="text-red-500 ml-1">*</span>;
                      }
                    }
                    return null;
                  })()}
                </label>
                {errors.attachments && (
                  <p className="text-sm text-red-500 mb-2">{errors.attachments}</p>
                )}
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
                      <div key={file.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors group">
                        <button
                          type="button"
                          onClick={() => handleAttachmentPreview(file)}
                          className="flex items-center gap-2 flex-1 text-left min-w-0"
                          disabled={isLoading}
                        >
                          <span className="flex-shrink-0">
                            {getAttachmentIcon(file.mimeType || 'application/octet-stream')}
                          </span>
                          <span className="text-au-grey-text truncate flex-1">{file.originalName}</span>
                          <Eye size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(file.id);
                          }}
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-sm font-medium text-au-grey-text">Tags</span>
                  <span className="text-xs text-au-grey-text/60">Add keywords that describe this publication.</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTags.length > 0 ? (
                    selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-au-green/10 text-au-green rounded-full"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-500 transition-colors"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-au-grey-text/60">No tags selected yet.</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Type a tag and press Enter"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                    disabled={isLoading}
                  />
                  {tagInput.trim() && filteredTagSuggestions.length > 0 && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredTagSuggestions.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleTagSuggestionClick(tag.name);
                          }}
                          className="w-full px-4 py-2 flex items-center justify-between text-sm text-au-grey-text hover:bg-gray-50 transition-colors"
                        >
                          <span>{tag.name}</span>
                          {tag.usageCount !== undefined && tag.usageCount > 0 && (
                            <span className="text-xs text-au-grey-text/60">{tag.usageCount}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!tagInput.trim() && availableTags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-au-grey-text/60 mb-2">Popular tags</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTags
                        .filter((tag) => !normalizedSelectedTags.has(tag.name.toLowerCase()))
                        .slice(0, 8)
                        .map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagSuggestionClick(tag.name)}
                            className="px-3 py-1.5 text-xs font-medium text-au-grey-text bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            #{tag.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Settings & Publishing */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-au-grey-text">
                  {t('publications.status')}
                </label>

                {!isEditMode && (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm text-au-grey-text/80">
                    {t('publications.newSavesAsDraft') || 'New publications are saved as drafts by default.'}
                  </div>
                )}

                {isEditMode && (
                  canUpdateStatus ? (
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAsDraft}
                          onChange={(e) => handleSaveAsDraftToggle(e.target.checked)}
                          className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                          disabled={isLoading}
                        />
                        <span className="text-sm text-au-grey-text font-medium">
                          {t('publications.saveAsDraft') || 'Save as Draft'}
                        </span>
                      </label>
                      <p className="text-xs text-au-grey-text/70">
                        {saveAsDraft
                          ? (t('publications.saveAsDraftHelper') || 'Keep this publication unpublished until you are ready.')
                          : (t('publications.autoPendingHelper') || 'This update will mark the publication as Pending for review.')}
                      </p>
                      {!saveAsDraft && (
                        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          {t('publications.pendingOnSubmit') || 'Saving will move this publication back to Pending status.'}
                        </div>
                      )}
                      {status !== 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleSaveAsDraftToggle(true)}
                          disabled={isLoading}
                          className="inline-flex items-center px-3 py-2 text-xs font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {t('publications.unpublish') || 'Unpublish'}
                        </button>
                      )}
                      <div className="px-3 py-2 border border-gray-200 rounded bg-gray-50 text-xs text-au-grey-text/80">
                        <span className="font-medium">{t('publications.currentStatus') || 'Current status:'}</span>{' '}
                        {getStatusLabel(status)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <span className="text-au-grey-text font-medium">{getStatusLabel(status)}</span>
                    </div>
                  )
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedulePublication}
                    onChange={(e) => {
                      setSchedulePublication(e.target.checked);
                      if (!e.target.checked) {
                        setPublicationDate('');
                      } else if (!publicationDate) {
                        setPublicationDate(formatDateTimeForInput(new Date().toISOString()));
                      }
                    }}
                    className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                    disabled={isLoading}
                  />
                  <span className="text-sm font-medium text-au-grey-text">{t('publications.schedulePublication') || 'Schedule Publication'}</span>
                </label>
                <div className={cn(schedulePublication ? 'mt-2' : 'hidden')}>
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    {t('publications.publicationDate')}
                  </label>
                  <input
                    type="datetime-local"
                    step="1"
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                    disabled={isLoading}
                  />
                </div>
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
                    <span>{isEditMode ? (t('publications.update') || t('publications.updatePublication') || 'Update Publication') : t('publications.create')}</span>
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
        filterMimeTypes={['image/*', 'video/*']}
        title={t('publications.coverImage')}
        description={t('publications.selectImageOrVideo')}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={previewFile}
      />
    </div>
  );
}
