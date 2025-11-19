'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Tag, CheckCircle2, FileText, X, Image as ImageIcon, FolderOpen, Copy, FileIcon, Video, Music, Archive, FileSpreadsheet, FileCode, Eye, RefreshCw } from 'lucide-react';
import { cn, getImageUrl, PLACEHOLDER_IMAGE_PATH, isImageFile, isVideoFile, isAudioFile, isPdfFile, stripHtmlTags } from '@/utils/fileUtils';
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
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [previewFile, setPreviewFile] = useState<FileWithUrls | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [sourceValue, setSourceValue] = useState('');
  const [availableCreatorNames, setAvailableCreatorNames] = useState<string[]>([]);
  const [creatorNameValue, setCreatorNameValue] = useState('');

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
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);
  const [isCapturingThumbnail, setIsCapturingThumbnail] = useState(false);
  const [showVideoForCapture, setShowVideoForCapture] = useState(false); // Toggle to show video when thumbnail is captured
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const videoBlobUrlRef = useRef<string | null>(null);
  const autoCapturedRef = useRef<string | null>(null); // Track if we've auto-captured for current video
  const isVideoMimeType = (mimeType?: string) => Boolean(mimeType && mimeType.startsWith('video/'));
  const isImageMimeType = (mimeType?: string) => Boolean(mimeType && mimeType.startsWith('image/'));
  const isVideoPath = (filePath?: string | null) => {
    if (!filePath) return false;
    const normalizedPath = (filePath.split('?')[0] || '').toLowerCase();
    return /\.(mp4|mov|mpe?g|avi|wmv|webm|ogg|ogv)$/.test(normalizedPath);
  };

  const padNumber = (value: number, length: number = 2) => String(value).padStart(length, '0');

  const extractYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

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

  const youtubeVideoId = useMemo(() => {
    return youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;
  }, [youtubeUrl]);

  const coverIsVideo = useMemo(() => {
    if (youtubeVideoId) return true;
    if (coverFile) {
      return isVideoMimeType(coverFile.mimeType);
    }
    return isVideoPath(existingCoverImage);
  }, [youtubeVideoId, coverFile, existingCoverImage]);

  // Load video file as blob URL for preview (similar to FilePreviewModal)
  useEffect(() => {
    if (coverFile && coverIsVideo && coverFile.id) {
      // Only reload if blob URL doesn't exist
      if (!videoBlobUrlRef.current) {
        // Load blob URL for video files to ensure proper playback
        const fetchVideoBlob = async () => {
          try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
            
            const headers: HeadersInit = {
              'Content-Type': 'application/json',
            };
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiBaseUrl}/api/files/${coverFile.id}/download`, {
              headers
            });

            if (!response.ok) {
              throw new Error(`Failed to load video: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            // Clean up previous blob URL if it exists
            if (videoBlobUrlRef.current && videoBlobUrlRef.current !== url) {
              URL.revokeObjectURL(videoBlobUrlRef.current);
            }
            
            videoBlobUrlRef.current = url;
            setVideoBlobUrl(url);
          } catch (err) {
            console.error('Failed to fetch video for preview:', err);
            setVideoBlobUrl(null);
          }
        };

        fetchVideoBlob();
      } else {
        // Blob URL already exists, just update state
        setVideoBlobUrl(videoBlobUrlRef.current);
      }

      // Cleanup blob URL only on unmount or file change
      return () => {
        // Don't clean up - keep blob URL for reuse when switching views
      };
    } else if (!coverFile) {
      // Only clean up if we no longer have a video file
      if (videoBlobUrlRef.current) {
        URL.revokeObjectURL(videoBlobUrlRef.current);
        videoBlobUrlRef.current = null;
      }
      setVideoBlobUrl(null);
    }
  }, [coverFile?.id, coverIsVideo]);

  // Auto-capture thumbnail when uploaded video is ready
  useEffect(() => {
    if (coverFile && coverIsVideo && videoRef.current && !capturedThumbnail && !showVideoForCapture && !isCapturingThumbnail) {
      const videoElement = videoRef.current;
      const videoKey = coverFile.id || coverFile.filePath || 'unknown';
      
      // Only auto-capture once per video
      if (autoCapturedRef.current === videoKey) {
        return;
      }

      const handleVideoReady = async () => {
        // Ensure video has valid dimensions
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          // Wait a bit for video dimensions to be available
          setTimeout(() => {
            if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && autoCapturedRef.current !== videoKey && !isCapturingThumbnail) {
              autoCapturedRef.current = videoKey;
              handleCaptureThumbnail().catch(err => {
                console.error('Auto-capture failed:', err);
                // Reset so we can try again
                autoCapturedRef.current = null;
              });
            }
          }, 500);
          return;
        }

        // Seek to first second for better frame
        if (videoElement.duration > 1) {
          videoElement.currentTime = 1;
          videoElement.addEventListener('seeked', () => {
            if (autoCapturedRef.current !== videoKey && !isCapturingThumbnail) {
              autoCapturedRef.current = videoKey;
              handleCaptureThumbnail().catch(err => {
                console.error('Auto-capture failed:', err);
                autoCapturedRef.current = null;
              });
            }
          }, { once: true });
        } else {
          // Video is too short, capture immediately
          if (autoCapturedRef.current !== videoKey && !isCapturingThumbnail) {
            autoCapturedRef.current = videoKey;
            handleCaptureThumbnail().catch(err => {
              console.error('Auto-capture failed:', err);
              autoCapturedRef.current = null;
            });
          }
        }
      };

      // Check if video is already loaded
      if (videoElement.readyState >= 2) {
        handleVideoReady();
      } else {
        videoElement.addEventListener('loadeddata', handleVideoReady, { once: true });
        videoElement.addEventListener('canplay', handleVideoReady, { once: true });
      }

      return () => {
        videoElement.removeEventListener('loadeddata', handleVideoReady);
        videoElement.removeEventListener('canplay', handleVideoReady);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverFile?.id, coverFile?.filePath, coverIsVideo, capturedThumbnail, showVideoForCapture, isCapturingThumbnail]);

  // Auto-capture thumbnail when YouTube video URL is set
  useEffect(() => {
    if (youtubeVideoId && youtubeUrl && !capturedThumbnail && !showVideoForCapture && !isCapturingThumbnail) {
      const youtubeKey = youtubeVideoId;
      
      // Only auto-capture once per YouTube video
      if (autoCapturedRef.current === youtubeKey) {
        return;
      }

      // Auto-capture YouTube thumbnail after a short delay to ensure URL is stable
      const timeoutId = setTimeout(() => {
        if (autoCapturedRef.current !== youtubeKey && !isCapturingThumbnail) {
          autoCapturedRef.current = youtubeKey;
          handleCaptureThumbnail().catch(err => {
            console.error('Auto-capture YouTube thumbnail failed:', err);
            autoCapturedRef.current = null;
          });
        }
      }, 1000); // Wait 1 second for YouTube iframe to potentially load

      return () => {
        clearTimeout(timeoutId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeVideoId, youtubeUrl, capturedThumbnail, showVideoForCapture, isCapturingThumbnail]);

  // Reset auto-capture tracking when video changes
  useEffect(() => {
    const currentKey = coverFile?.id || coverFile?.filePath || youtubeVideoId;
    if (autoCapturedRef.current && autoCapturedRef.current !== currentKey) {
      autoCapturedRef.current = null;
    }
  }, [coverFile?.id, coverFile?.filePath, youtubeVideoId]);

  const coverPreviewSource = useMemo(() => {
    // If showing video for capture, prioritize video source over captured thumbnail
    if (showVideoForCapture) {
      // YouTube URL
      if (youtubeVideoId) {
        return `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
      }
      // Uploaded video
      if (coverFile && coverIsVideo) {
        if (videoBlobUrl) {
          return videoBlobUrl;
        }
        return (
          coverFile.downloadUrl ||
          (coverFile.filePath ? getImageUrl(coverFile.filePath) : undefined) ||
          coverFile.thumbnailUrl ||
          ''
        );
      }
    }
    
    // Captured thumbnail takes priority (when not showing video)
    if (capturedThumbnail && !showVideoForCapture) {
      console.log('Using captured thumbnail:', capturedThumbnail);
      // If captured thumbnail is a file path (not a full URL or blob), convert it
      if (capturedThumbnail && 
          !capturedThumbnail.startsWith('http') && 
          !capturedThumbnail.startsWith('blob:')) {
        // Convert file path to URL using getImageUrl (handles both relative and absolute paths)
        const imageUrl = getImageUrl(capturedThumbnail);
        console.log('Converted file path to image URL:', imageUrl);
        return imageUrl;
      }
      return capturedThumbnail;
    }
    
    // YouTube URL takes priority
    if (youtubeVideoId) {
      return `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
    }
    
    if (coverFile) {
      if (coverIsVideo) {
        // Use blob URL for new publications, or downloadUrl/filePath for edit mode
        if (videoBlobUrl) {
          return videoBlobUrl;
        }
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
  }, [capturedThumbnail, youtubeVideoId, coverFile, coverIsVideo, existingCoverImage, videoBlobUrl, showVideoForCapture]);

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

  const filteredSourceSuggestions = useMemo(() => {
    const query = sourceValue.trim().toLowerCase();
    const list = query
      ? availableSources.filter((s) => s.toLowerCase().includes(query))
      : availableSources;
    return list.slice(0, 8);
  }, [availableSources, sourceValue]);

  const filteredCreatorNameSuggestions = useMemo(() => {
    const query = creatorNameValue.trim().toLowerCase();
    const list = query
      ? availableCreatorNames.filter((cn) => cn.toLowerCase().includes(query))
      : availableCreatorNames;
    return list.slice(0, 8);
  }, [availableCreatorNames, creatorNameValue]);

  const showSourceSuggestions = sourceValue.trim().length > 0 && filteredSourceSuggestions.length > 0;
  const showCreatorNameSuggestions = creatorNameValue.trim().length > 0 && filteredCreatorNameSuggestions.length > 0;

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

    const fetchSources = async () => {
      try {
        const response = await apiClient.getSources();
        if (response.success && response.data?.sources) {
          setAvailableSources(response.data.sources);
        }
      } catch (error) {
        console.error('Failed to load sources:', error);
      }
    };

    const fetchCreatorNames = async () => {
      try {
        const response = await apiClient.getCreatorNames();
        if (response.success && response.data?.creatorNames) {
          setAvailableCreatorNames(response.data.creatorNames);
        }
      } catch (error) {
        console.error('Failed to load creator names:', error);
      }
    };

    fetchTags();
    fetchSources();
    fetchCreatorNames();
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
        if (publication.youtubeUrl) {
          setYoutubeUrl(publication.youtubeUrl);
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

        setSourceValue(typeof publication.source === 'string' ? publication.source : '');
        setCreatorNameValue(typeof publication.creatorName === 'string' ? publication.creatorName : '');
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
    console.log('Existing attachment files:', attachmentFiles);

    // Merge new files with existing ones, avoiding duplicates
    const existingFileIds = new Set(attachmentFiles.map(f => f.id));
    const newFiles = files.filter(f => !existingFileIds.has(f.id));
    const mergedFiles = [...attachmentFiles, ...newFiles];

    console.log('New files to add:', newFiles);
    console.log('Merged files:', mergedFiles);

    if (categoryId && mergedFiles.length > 0) {
      const selectedCategory = categories.find(c => c.id === categoryId);
      if (selectedCategory) {
        const categoryNameLower = selectedCategory.name.toLowerCase();
        const categorySlugLower = selectedCategory.slug.toLowerCase();
        const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
        const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
        const hasYouTubeUrl = youtubeUrl && youtubeUrl.trim() !== '';

        if (isAudioCategory || isVideoCategory) {
          // Skip first attachment matching validation if YouTube URL is provided for video category
          if (isVideoCategory && hasYouTubeUrl) {
            // YouTube URL is provided, attachments are optional and don't need to match
          } else {
            // Check the first attachment in the merged list (prioritize existing first attachment if it matches)
            const firstAttachment = mergedFiles.find(f => 
              (isAudioCategory && f.mimeType?.startsWith('audio/')) ||
              (isVideoCategory && f.mimeType?.startsWith('video/'))
            ) || mergedFiles[0];
            
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
    }

    setAttachmentFiles(mergedFiles);
    setAttachmentFileIds(mergedFiles.map(f => f.id));
    console.log('Attachment file IDs set:', mergedFiles.map(f => f.id));
    console.log('Current attachmentFiles state will be:', mergedFiles);

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

  const captureFrameFromVideo = (videoElement: HTMLVideoElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || videoElement.clientWidth;
        canvas.height = videoElement.videoHeight || videoElement.clientHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw the current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from canvas'));
            return;
          }
          
          // Create object URL from blob
          const blobUrl = URL.createObjectURL(blob);
          resolve(blobUrl);
        }, 'image/jpeg', 0.95);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleCaptureThumbnail = async () => {
    try {
      setIsCapturingThumbnail(true);
      
      // For uploaded videos - capture frame from video element using canvas
      if (coverFile && coverIsVideo && videoRef.current) {
        try {
          const videoElement = videoRef.current;
          
          // Ensure video is loaded and seek to current time if needed
          if (videoElement.readyState < 2) {
            // Wait for video to load enough data
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                videoElement.removeEventListener('loadeddata', onLoadedData);
                videoElement.removeEventListener('seeked', onSeeked);
                videoElement.removeEventListener('error', onError);
                reject(new Error('Video loading timeout'));
              }, 5000);
              
              const onLoadedData = () => {
                // Seek to current time to ensure frame is ready
                const currentTime = videoElement.currentTime || 1;
                if (currentTime > 0 && currentTime < videoElement.duration) {
                  videoElement.currentTime = currentTime;
                  videoElement.addEventListener('seeked', onSeeked, { once: true });
                } else {
                  clearTimeout(timeout);
                  videoElement.removeEventListener('error', onError);
                  resolve();
                }
              };
              
              const onSeeked = () => {
                clearTimeout(timeout);
                videoElement.removeEventListener('loadeddata', onLoadedData);
                videoElement.removeEventListener('error', onError);
                resolve();
              };
              
              const onError = () => {
                clearTimeout(timeout);
                videoElement.removeEventListener('loadeddata', onLoadedData);
                videoElement.removeEventListener('seeked', onSeeked);
                reject(new Error('Video failed to load'));
              };
              
              videoElement.addEventListener('loadeddata', onLoadedData, { once: true });
              videoElement.addEventListener('error', onError, { once: true });
              
              // Trigger load if not already loading
              if (videoElement.readyState === 0) {
                videoElement.load();
              }
            });
          } else {
            // Video is already loaded, but ensure current frame is ready
            const currentTime = videoElement.currentTime || 1;
            if (currentTime > 0 && currentTime < (videoElement.duration || Infinity)) {
              await new Promise<void>((resolve) => {
                const onSeeked = () => {
                  videoElement.removeEventListener('seeked', onSeeked);
                  resolve();
                };
                videoElement.addEventListener('seeked', onSeeked, { once: true });
                videoElement.currentTime = currentTime;
                // Timeout in case seeked doesn't fire
                setTimeout(() => {
                  videoElement.removeEventListener('seeked', onSeeked);
                  resolve();
                }, 1000);
              });
            }
          }
          
          // Wait a bit for video to be fully ready
          if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
            await new Promise<void>((resolve) => {
              const checkReady = () => {
                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                  resolve();
                } else {
                  setTimeout(checkReady, 100);
                }
              };
              checkReady();
              // Max wait 2 seconds
              setTimeout(() => resolve(), 2000);
            });
          }
          
          // Capture frame from video element
          const blobUrl = await captureFrameFromVideo(videoElement);
          
          // Upload the captured frame as a file
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          
          // Create a File object from the blob
          const file = new File([blob], `thumbnail-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          // Upload the thumbnail file
          const formData = new FormData();
          formData.append('file', file);
          
          const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const uploadResponse = await fetch(`${apiBaseUrl}/api/files/upload`, {
            method: 'POST',
            headers,
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload thumbnail');
          }
          
          const uploadData = await uploadResponse.json();
          
          if (uploadData.success && uploadData.data?.file) {
            const uploadedFile = uploadData.data.file;
            // For images, prefer filePath converted to URL, then thumbnailUrl, then downloadUrl
            // thumbnailUrl might be null for image files, and downloadUrl requires auth
            let thumbnailUrl: string | null = null;
            
            if (uploadedFile.filePath) {
              // Use filePath converted to image URL (this is the most reliable for display)
              thumbnailUrl = getImageUrl(uploadedFile.filePath);
            } else if (uploadedFile.thumbnailUrl) {
              // Use thumbnailUrl if available (full URL)
              thumbnailUrl = uploadedFile.thumbnailUrl;
            } else if (uploadedFile.downloadUrl) {
              // Fallback to downloadUrl
              thumbnailUrl = uploadedFile.downloadUrl;
            }
            
            if (!thumbnailUrl) {
              // Last resort: keep blob URL (will be lost on refresh but at least shows)
              console.warn('No valid URL found for captured thumbnail, using blob URL');
              thumbnailUrl = blobUrl;
            }
            
            console.log('Setting captured thumbnail:', { 
              thumbnailUrl, 
              filePath: uploadedFile.filePath, 
              thumbnailUrlFromAPI: uploadedFile.thumbnailUrl,
              downloadUrl: uploadedFile.downloadUrl 
            });
            
            setCapturedThumbnail(thumbnailUrl);
            // Set the uploaded file path as cover image for form submission
            setExistingCoverImage(uploadedFile.filePath);
            // Hide video view and show captured thumbnail
            setShowVideoForCapture(false);
            // Clean up blob URL only if we have a server URL
            if (thumbnailUrl !== blobUrl) {
              URL.revokeObjectURL(blobUrl);
            }
            showSuccess('Frame captured and saved successfully');
          } else {
            // Fallback: use blob URL directly (will be lost on page refresh)
            console.warn('Upload failed, using blob URL as fallback');
            setCapturedThumbnail(blobUrl);
            setShowVideoForCapture(false);
            showError('Frame captured but failed to upload. It will be lost on page refresh.');
          }
        } catch (error) {
          console.error('Failed to capture frame from video:', error);
          showError(error instanceof Error ? error.message : 'Failed to capture frame from video');
        }
      } else if (youtubeVideoId && youtubeUrl) {
        // For YouTube videos, capture frame from YouTube's thumbnail API
        // Note: Direct YouTube video URLs aren't accessible due to CORS,
        // so we'll use YouTube's thumbnail API (which provides frame at default timestamp)
        // and upload it as a file, similar to uploaded videos
        try {
          // Get YouTube's high-quality thumbnail (this is the best we can do on frontend
          // without backend service, as YouTube doesn't allow direct video access)
          const thumbnailUrls = [
            `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`,
            `https://img.youtube.com/vi/${youtubeVideoId}/sddefault.jpg`
          ];
          
          // Try each thumbnail URL until one works
          let imgBlob: Blob | null = null;
          for (const thumbnailUrl of thumbnailUrls) {
            try {
              const imgResponse = await fetch(thumbnailUrl);
              if (imgResponse.ok) {
                imgBlob = await imgResponse.blob();
                break;
              }
            } catch {
              // Continue to next fallback
            }
          }
          
          if (!imgBlob) {
            throw new Error('Failed to fetch YouTube thumbnail from all sources');
          }
          
          // Create a File object from the blob
          const file = new File([imgBlob], `youtube-thumbnail-${youtubeVideoId}-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          // Upload the thumbnail file (same as uploaded videos)
          const formData = new FormData();
          formData.append('file', file);
          
          const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const uploadResponse = await fetch(`${apiBaseUrl}/api/files/upload`, {
            method: 'POST',
            headers,
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload thumbnail');
          }
          
          const uploadData = await uploadResponse.json();
          
          if (uploadData.success && uploadData.data?.file) {
            const uploadedFile = uploadData.data.file;
            // For images, prefer filePath converted to URL, then thumbnailUrl, then downloadUrl
            let thumbnailUrlToUse: string | null = null;
            
            if (uploadedFile.filePath) {
              thumbnailUrlToUse = getImageUrl(uploadedFile.filePath);
            } else if (uploadedFile.thumbnailUrl) {
              thumbnailUrlToUse = uploadedFile.thumbnailUrl;
            } else if (uploadedFile.downloadUrl) {
              thumbnailUrlToUse = uploadedFile.downloadUrl;
            }
            
            if (thumbnailUrlToUse) {
              setCapturedThumbnail(thumbnailUrlToUse);
              setExistingCoverImage(uploadedFile.filePath);
              setShowVideoForCapture(false);
              showSuccess('Frame captured successfully');
            } else {
              throw new Error('Failed to get thumbnail URL from upload');
            }
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          console.error('Failed to capture YouTube frame on frontend:', error);
          // Fall back to backend API if frontend capture fails (for timestamp-specific frames)
          try {
            const youtubeTimestamp = 1;
            const response = await apiClient.extractVideoThumbnail({
              youtubeUrl,
              timestamp: youtubeTimestamp
            });
            
            if (response.success && response.data?.thumbnailPath) {
              const thumbnailPath = response.data.thumbnailPath;
              setCapturedThumbnail(thumbnailPath);
              setExistingCoverImage(thumbnailPath);
              setShowVideoForCapture(false);
              showSuccess('Frame captured successfully');
            } else {
              throw new Error('Backend API also failed');
            }
          } catch (fallbackError) {
            console.error('Failed to capture YouTube thumbnail via backend:', fallbackError);
            showError('Failed to capture frame from YouTube video');
          }
        }
      } else {
        showError('No video available to capture');
      }
    } catch (error) {
      console.error('Failed to capture thumbnail:', error);
      showError(error instanceof Error ? error.message : 'Failed to capture frame');
    } finally {
      setIsCapturingThumbnail(false);
    }
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
    
    // Check for YouTube URL
    const hasYouTubeUrl = youtubeUrl && youtubeUrl.trim() !== '';
    
    if (isAudioCategory || isVideoCategory) {
      // If YouTube URL is provided for video category, skip attachment validation
      if (isVideoCategory && hasYouTubeUrl) {
        // YouTube URL is provided, attachments are optional
        return true;
      }
      
      if (attachmentFiles.length === 0) {
        const message = `Publications in ${isAudioCategory ? 'audio' : 'video'} categories must have at least one ${isAudioCategory ? 'audio' : 'video'} attachment${isVideoCategory ? ' or YouTube URL' : ''}`;
        setErrors(prev => ({
          ...prev,
          attachments: message
        }));
        showError(message);
        return false;
      }
      
      // Mandate that the FIRST attachment matches the category type (unless YouTube URL is provided for video)
      if (!hasYouTubeUrl || !isVideoCategory) {
        const firstAttachment = attachmentFiles[0];
        if (!firstAttachment) {
          const message = `Publications in ${isAudioCategory ? 'audio' : 'video'} categories must have at least one ${isAudioCategory ? 'audio' : 'video'} attachment${isVideoCategory ? ' or YouTube URL' : ''}`;
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
        const message = `Publications in ${isAudioCategory ? 'audio' : 'video'} categories must have at least one ${isAudioCategory ? 'audio' : 'video'} attachment${isVideoCategory ? ' or YouTube URL' : ''}`;
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
      // If YouTube URL is provided, cover and attachments are optional
      const hasYouTubeUrl = youtubeUrl && youtubeUrl.trim() !== '';
      const hasCover = Boolean(coverFile || existingCoverImage);
      if (!hasCover && !hasYouTubeUrl) {
        const message = t('publications.coverRequired') || 'A cover image or YouTube URL is required.';
        newErrors.cover = message;
        errorMessages.push(message);
      }

      // Only require attachments if no YouTube URL is provided
      if (!hasYouTubeUrl && attachmentFiles.length === 0) {
        const selectedCategory = categories.find(c => c.id === categoryId);
        if (selectedCategory) {
          const categoryNameLower = selectedCategory.name.toLowerCase();
          const categorySlugLower = selectedCategory.slug.toLowerCase();
          const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
          const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
          if (isAudioCategory || isVideoCategory) {
            const message = t('publications.attachmentsRequired') || 'Please select at least one attachment or provide a YouTube URL.';
            newErrors.attachments = message;
            errorMessages.push(message);
          }
        }
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
      // Captured thumbnail takes priority
      let coverImageUrl: string | undefined = undefined;
      
      if (capturedThumbnail && existingCoverImage) {
        // Use captured thumbnail path
        coverImageUrl = existingCoverImage;
      } else if (coverFile) {
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
          youtubeUrl: youtubeUrl && youtubeUrl.trim() !== '' ? youtubeUrl.trim() : undefined,
          categoryId,
          subcategoryIds: subcategoryIds.length > 0 ? subcategoryIds : undefined,
          attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
          status: submissionStatus,
          publicationDate: formattedPublicationDate,
          hasComments,
          isFeatured,
          isLeaderboard,
          tags: selectedTags,
          source: sourceValue.trim() ? sourceValue.trim() : undefined,
          creatorName: creatorNameValue.trim() ? creatorNameValue.trim() : undefined,
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
          youtubeUrl: youtubeUrl && youtubeUrl.trim() !== '' ? youtubeUrl.trim() : undefined,
          categoryId,
          subcategoryIds: subcategoryIds.length > 0 ? subcategoryIds : undefined,
          attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
          status: submissionStatus,
          publicationDate: formattedPublicationDate,
          hasComments,
          isFeatured,
          isLeaderboard,
          tags: selectedTags,
          source: sourceValue.trim() ? sourceValue.trim() : undefined,
          creatorName: creatorNameValue.trim() ? creatorNameValue.trim() : undefined,
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
                          const hasYouTubeUrl = youtubeUrl && youtubeUrl.trim() !== '';
                          // Skip first attachment matching validation if YouTube URL is provided for video category
                          if (isVideoCategory && hasYouTubeUrl) {
                            // YouTube URL is provided, attachments are optional and don't need to match
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.attachments;
                              return newErrors;
                            });
                          } else {
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
                {coverFile || existingCoverImage || youtubeVideoId ? (
                  <div className="relative">
                    <div className={`w-full ${coverIsVideo ? 'h-96 md:h-[28rem]' : 'h-64'} bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center transition-all duration-300`}>
                      {capturedThumbnail && !showVideoForCapture ? (
                        // Show captured thumbnail as cover image (highest priority)
                        <div className="relative w-full h-full bg-gray-100">
                          <img
                            key={`captured-thumbnail-${capturedThumbnail}`}
                            src={coverPreviewSource}
                            alt={t('publications.coverImagePreview')}
                            className="w-full h-full object-cover absolute inset-0 z-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.error('Failed to load captured thumbnail:', coverPreviewSource);
                              // Only fall back to placeholder if current source is not already placeholder
                              if (!target.src.includes(PLACEHOLDER_IMAGE_PATH)) {
                                const placeholderUrl = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                                target.src = placeholderUrl;
                              }
                            }}
                            onLoad={() => {
                              console.log('Captured thumbnail loaded successfully:', coverPreviewSource);
                            }}
                          />
                          {/* Show video button when thumbnail is captured (for both uploaded videos and YouTube) */}
                          {(coverFile && coverIsVideo) || youtubeVideoId ? (
                            <button
                              type="button"
                              onClick={() => setShowVideoForCapture(true)}
                              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center gap-2 shadow-lg z-20"
                              disabled={isLoading}
                              title="Change frame from video"
                            >
                              <Video size={16} />
                              <span>Change Frame</span>
                            </button>
                          ) : null}
                          {/* Captured thumbnail badge */}
                          <div className="absolute top-2 left-2 bg-au-gold text-white px-2 py-1 rounded text-xs font-semibold z-20">
                            Captured Frame
                          </div>
                        </div>
                      ) : youtubeVideoId && (!capturedThumbnail || showVideoForCapture) ? (
                        <div className="w-full h-full relative">
                          {/* YouTube Player for scrubbing */}
                          <div className="relative w-full h-full">
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&rel=0`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={t('publications.coverImagePreview')}
                            />
                            <button
                              type="button"
                              onClick={handleCaptureThumbnail}
                              disabled={isCapturingThumbnail || isLoading}
                              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-au-gold text-white rounded-lg hover:bg-au-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg z-10"
                            >
                              {isCapturingThumbnail ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Capturing...</span>
                                </>
                              ) : (
                                <>
                                  <ImageIcon size={16} />
                                  <span>Capture Frame as Cover</span>
                                </>
                              )}
                            </button>
                            {/* Cancel button when changing frame */}
                            {capturedThumbnail && showVideoForCapture && (
                              <button
                                type="button"
                                onClick={() => setShowVideoForCapture(false)}
                                className="absolute top-2 left-2 px-3 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex items-center gap-2 z-10"
                                disabled={isLoading}
                              >
                                <X size={14} />
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                          {/* YouTube Badge */}
                          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold z-10">
                            YouTube
                          </div>
                        </div>
                      ) : coverIsVideo && (!capturedThumbnail || showVideoForCapture) ? (
                        // Show video when no thumbnail captured, or when user wants to change frame
                        coverFile?.id && !videoBlobUrl && coverIsVideo ? (
                          // Show loading state while blob URL is being fetched
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-au-corporate-green mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">Loading video preview...</p>
                            </div>
                          </div>
                        ) : coverPreviewSource ? (
                          <div className="relative w-full h-full">
                            <video
                              ref={videoRef}
                              key={coverFile?.id || existingCoverImage || 'cover-preview-video'}
                              className="w-full h-full object-cover"
                              controls
                              preload="metadata"
                            >
                              <source src={coverPreviewSource} type={coverPreviewMime} />
                              {t('publications.videoPreviewNotSupported') || 'Video preview not supported.'}
                            </video>
                            <button
                              type="button"
                              onClick={handleCaptureThumbnail}
                              disabled={isCapturingThumbnail || isLoading}
                              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-au-gold text-white rounded-lg hover:bg-au-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg z-10"
                            >
                              {isCapturingThumbnail ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Capturing...</span>
                                </>
                              ) : (
                                <>
                                  <ImageIcon size={16} />
                                  <span>Capture Frame as Cover</span>
                                </>
                              )}
                            </button>
                            {/* Show "Use as Cover" button when changing frame */}
                            {capturedThumbnail && showVideoForCapture && (
                              <button
                                type="button"
                                onClick={() => setShowVideoForCapture(false)}
                                className="absolute top-2 left-2 px-3 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex items-center gap-2 z-10"
                                disabled={isLoading}
                              >
                                <X size={14} />
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">{t('publications.videoPreviewNotAvailable') || 'Video preview not available.'}</div>
                        )
                      ) : (
                        // Regular image (non-video, non-captured)
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
                        setYoutubeUrl('');
                        setCapturedThumbnail(null);
                        setShowVideoForCapture(false);
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
                  {t('publications.youtubeUrl') || 'YouTube URL'} <span className="text-gray-500 text-xs font-normal">(Optional - alternative to cover image and attachments)</span>
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    if (errors.cover) {
                      setErrors(prev => {
                        const updated = { ...prev };
                        delete updated.cover;
                        return updated;
                      });
                    }
                    if (errors.attachments) {
                      setErrors(prev => {
                        const updated = { ...prev };
                        delete updated.attachments;
                        return updated;
                      });
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-transparent"
                  disabled={isLoading}
                />
                {youtubeUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('publications.youtubeUrlNote') || 'When a YouTube URL is provided, cover image and attachments are optional.'}
                  </p>
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
                      const plainText = stripHtmlTags(description);
                      setMetaDescription(plainText);
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-sm font-medium text-au-grey-text">Source</span>
                  <span className="text-xs text-au-grey-text/60">Select or type a source for this publication.</span>
                </div>

                <div className="flex items-center gap-2 mb-3 min-h-[32px]">
                  {sourceValue ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium bg-au-green/10 text-au-green rounded-full">
                      {sourceValue}
                      <button
                        type="button"
                        onClick={() => setSourceValue('')}
                        className="hover:text-red-500 transition-colors"
                        aria-label="Clear source"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-au-grey-text/60">No source selected yet.</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={sourceValue}
                    onChange={(event) => setSourceValue(event.target.value)}
                    placeholder="Type or select a source"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                    disabled={isLoading}
                  />
                  {showSourceSuggestions && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredSourceSuggestions.map((source) => (
                        <button
                          key={source}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setSourceValue(source);
                          }}
                          className="w-full px-4 py-2 flex items-center justify-between text-sm text-au-grey-text hover:bg-gray-50 transition-colors"
                        >
                          <span>{source}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!sourceValue.trim() && availableSources.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-au-grey-text/60 mb-2">Available sources</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSources.slice(0, 8).map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => setSourceValue(source)}
                          className="px-3 py-1.5 text-xs font-medium text-au-grey-text bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-sm font-medium text-au-grey-text">Creator Name</span>
                  <span className="text-xs text-au-grey-text/60">Select or type a creator name for this publication.</span>
                </div>

                <div className="flex items-center gap-2 mb-3 min-h-[32px]">
                  {creatorNameValue ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium bg-au-green/10 text-au-green rounded-full">
                      {creatorNameValue}
                      <button
                        type="button"
                        onClick={() => setCreatorNameValue('')}
                        className="hover:text-red-500 transition-colors"
                        aria-label="Clear creator name"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-au-grey-text/60">No creator name selected yet.</span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={creatorNameValue}
                    onChange={(event) => setCreatorNameValue(event.target.value)}
                    placeholder="Type or select a creator name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
                    disabled={isLoading}
                  />
                  {showCreatorNameSuggestions && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredCreatorNameSuggestions.map((creatorName) => (
                        <button
                          key={creatorName}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setCreatorNameValue(creatorName);
                          }}
                          className="w-full px-4 py-2 flex items-center justify-between text-sm text-au-grey-text hover:bg-gray-50 transition-colors"
                        >
                          <span>{creatorName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!creatorNameValue.trim() && availableCreatorNames.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-au-grey-text/60 mb-2">Available creator names</p>
                    <div className="flex flex-wrap gap-2">
                      {availableCreatorNames.slice(0, 8).map((creatorName) => (
                        <button
                          key={creatorName}
                          type="button"
                          onClick={() => setCreatorNameValue(creatorName)}
                          className="px-3 py-1.5 text-xs font-medium text-au-grey-text bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          {creatorName}
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
