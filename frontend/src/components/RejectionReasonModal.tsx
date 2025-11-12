'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/utils/fileUtils';

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  publicationTitle?: string;
  isLoading?: boolean;
}

export default function RejectionReasonModal({
  isOpen,
  onClose,
  onConfirm,
  publicationTitle,
  isLoading = false,
}: RejectionReasonModalProps) {
  const { t } = useTranslation();
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRejectionReason('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!rejectionReason.trim()) {
      setError(t('publications.rejectionReasonRequired') || 'Rejection reason is required');
      return;
    }

    onConfirm(rejectionReason.trim());
  };

  const handleCancel = () => {
    setRejectionReason('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-au-grey-text">
              {t('publications.rejectPublication') || 'Reject Publication'}
            </h2>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Publication Title */}
          {publicationTitle && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('publications.title') || 'Title'}</p>
              <p className="text-sm font-medium text-au-grey-text">{publicationTitle}</p>
            </div>
          )}

          {/* Rejection Reason Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-au-grey-text mb-2">
              {t('publications.rejectionReason') || 'Rejection Reason'} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('publications.rejectionReasonPlaceholder') || 'Please provide a reason for rejecting this publication...'}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-au-gold focus:border-au-gold resize-none',
                error ? 'border-red-500' : 'border-gray-300'
              )}
              rows={6}
              disabled={isLoading}
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {t('publications.rejectionReasonHint') || 'This reason will be visible to the publication creator.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-au-grey-text bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || !rejectionReason.trim()}
              className={cn(
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                isLoading || !rejectionReason.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600'
              )}
            >
              {isLoading ? (t('common.loading') || 'Loading...') : (t('publications.reject') || 'Reject')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

