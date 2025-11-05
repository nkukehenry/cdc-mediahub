'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, Check, XCircle, Edit2, Eye, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { showSuccess, showError } from '@/utils/errorHandler';
import { cn } from '@/utils/fileUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Publication {
  id: string;
  title: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  coverImage?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  status: 'pending' | 'draft' | 'approved' | 'rejected';
  publicationDate?: string;
  hasComments: boolean;
  isFeatured: boolean;
  isLeaderboard: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PublicationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicationId: string | null;
  onUpdate?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

export default function PublicationPreviewModal({
  isOpen,
  onClose,
  publicationId,
  onUpdate,
  onApprove,
  onReject,
  className
}: PublicationPreviewModalProps) {
  const { t } = useTranslation();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'draft' | 'approved' | 'rejected'>('pending');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isLeaderboard, setIsLeaderboard] = useState(false);
  const [hasComments, setHasComments] = useState(true);
  const [publicationDate, setPublicationDate] = useState('');

  useEffect(() => {
    if (isOpen && publicationId) {
      loadPublication();
    }
  }, [isOpen, publicationId]);

  const loadPublication = async () => {
    if (!publicationId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getPublicationById(publicationId);
      
      if (response.success && response.data?.post) {
        const pub = response.data.post;
        setPublication(pub);
        setTitle(pub.title || '');
        setSlug(pub.slug || '');
        setDescription(pub.description || '');
        setMetaTitle(pub.metaTitle || '');
        setMetaDescription(pub.metaDescription || '');
        setStatus(pub.status || 'pending');
        setIsFeatured(pub.isFeatured || false);
        setIsLeaderboard(pub.isLeaderboard || false);
        setHasComments(pub.hasComments ?? true);
        setPublicationDate(pub.publicationDate ? new Date(pub.publicationDate).toISOString().slice(0, 16) : '');
        setIsEditing(false);
      }
    } catch (error) {
      showError(t('errors.failedToLoadPublication'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!publicationId) return;

    try {
      setSaving(true);
      const response = await apiClient.updatePublication(publicationId, {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        status,
        isFeatured,
        isLeaderboard,
        hasComments,
        publicationDate: publicationDate || undefined,
      });

      if (response.success) {
        showSuccess(t('publications.publicationUpdated'));
        setIsEditing(false);
        await loadPublication();
        onUpdate?.();
      } else {
        showError(response.error?.message || t('errors.failedToUpdatePublication'));
      }
    } catch (error) {
      showError(t('errors.failedToUpdatePublication'));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!publicationId) return;

    try {
      setSaving(true);
      const response = await apiClient.approvePublication(publicationId);

      if (response.success) {
        showSuccess(t('publications.publicationApproved'));
        await loadPublication();
        onApprove?.();
      } else {
        showError(response.error?.message || t('errors.failedToApprovePublication'));
      }
    } catch (error) {
      showError(t('errors.failedToApprovePublication'));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!publicationId) return;

    try {
      setSaving(true);
      const response = await apiClient.rejectPublication(publicationId);

      if (response.success) {
        showSuccess(t('publications.publicationRejected'));
        await loadPublication();
        onReject?.();
      } else {
        showError(response.error?.message || t('errors.failedToRejectPublication'));
      }
    } catch (error) {
      showError(t('errors.failedToRejectPublication'));
    } finally {
      setSaving(false);
    }
  };

  const getCoverImageUrl = () => {
    if (!publication?.coverImage) return null;
    if (publication.coverImage.startsWith('http')) return publication.coverImage;
    return `${API_BASE_URL}/${publication.coverImage}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={!saving ? onClose : undefined}
      />
      
      <div className={cn(
        'relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[95vh] flex flex-col',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-au-gold/20 rounded-lg flex items-center justify-center">
              <Eye size={20} className="text-au-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-au-grey-text">
                {isEditing ? t('publications.editPublication') : t('publications.previewPublication')}
              </h2>
              <p className="text-sm text-au-grey-text/70">
                {publication?.status === 'pending' && t('publications.reviewBeforeApproval')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <>
                {publication?.status === 'pending' && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Check size={16} />
                      <span>{t('publications.approve')}</span>
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      <span>{t('publications.reject')}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={saving}
                  className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Edit2 size={16} />
                  <span>{t('common.edit')}</span>
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{saving ? t('common.saving') : t('common.save')}</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-au-grey-text">{t('common.loading')}...</div>
            </div>
          ) : (
            <>
              {/* Cover Image */}
              {getCoverImageUrl() && (
                <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={getCoverImageUrl() || ''}
                    alt={title || 'Cover'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.title')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    disabled={saving}
                  />
                ) : (
                  <div className="px-4 py-2 bg-gray-50 rounded-lg text-au-grey-text">
                    {title || '-'}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-au-grey-text mb-1">
                  {t('publications.description')}
                </label>
                {isEditing ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none resize-y"
                    disabled={saving}
                  />
                ) : (
                  <div 
                    className="px-4 py-2 bg-gray-50 rounded-lg text-au-grey-text prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: description || '-' }}
                  />
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    {t('publications.metaTitle')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                      disabled={saving}
                    />
                  ) : (
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-au-grey-text text-sm">
                      {metaTitle || '-'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    {t('publications.status')}
                  </label>
                  {isEditing ? (
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                      disabled={saving}
                    >
                      <option value="draft">{t('nav.draftPublications')}</option>
                      <option value="pending">{t('nav.pendingPublications')}</option>
                      <option value="approved">{t('publications.approved')}</option>
                      <option value="rejected">{t('nav.rejectedPublications')}</option>
                    </select>
                  ) : (
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-au-grey-text text-sm">
                      {status}
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              {isEditing && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                      disabled={saving}
                    />
                    <label htmlFor="isFeatured" className="text-sm text-au-grey-text">
                      {t('publications.isFeatured')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isLeaderboard"
                      checked={isLeaderboard}
                      onChange={(e) => setIsLeaderboard(e.target.checked)}
                      className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                      disabled={saving}
                    />
                    <label htmlFor="isLeaderboard" className="text-sm text-au-grey-text">
                      {t('publications.isLeaderboard')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="hasComments"
                      checked={hasComments}
                      onChange={(e) => setHasComments(e.target.checked)}
                      className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
                      disabled={saving}
                    />
                    <label htmlFor="hasComments" className="text-sm text-au-grey-text">
                      {t('publications.hasComments')}
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
