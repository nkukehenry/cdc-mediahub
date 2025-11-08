'use client';

import { useEffect, useState } from 'react';
import { FilePenLine, X } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface RenameFileModalProps {
  isOpen: boolean;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
}

export default function RenameFileModal({
  isOpen,
  initialValue = '',
  onClose,
  onSubmit
}: RenameFileModalProps) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFileName(initialValue);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return t('errors.fileNameRequired') || 'File name is required';
    }
    if (name.trim().length > 255) {
      return t('errors.fileNameTooLong') || 'File name is too long';
    }
    return null;
  };

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateName(fileName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(fileName.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : (t('errors.failedToRenameFile') || 'Failed to rename file');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        className={cn(
          'relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-au-gold/20 rounded-lg flex items-center justify-center">
              <FilePenLine size={20} className="text-au-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-au-grey-text">{t('modals.renameFile')}</h2>
              <p className="text-sm text-au-grey-text/70">{t('modals.renameFileDescription')}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">
              {t('modals.renameFileLabel')}
            </label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={t('modals.renameFilePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-green focus:border-transparent"
              autoFocus
              disabled={isLoading}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !fileName.trim()}
              className="px-4 py-2 bg-au-green text-au-white rounded-lg hover:bg-au-corporate-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('modals.renaming')}</span>
                </>
              ) : (
                <>
                  <FilePenLine size={16} />
                  <span>{t('modals.rename')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

