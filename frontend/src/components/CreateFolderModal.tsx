'use client';

import { useState } from 'react';
import { Folder, X } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { showSuccess } from '@/utils/errorHandler';
import { useTranslation } from '@/hooks/useTranslation';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, parentId?: string) => Promise<void>;
  parentId?: string;
  className?: string;
}

export default function CreateFolderModal({
  isOpen,
  onClose,
  onCreate,
  parentId,
  className
}: CreateFolderModalProps) {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError(t('errors.folderNameRequired'));
      return;
    }

    if (folderName.trim().length > 255) {
      setError(t('errors.folderNameTooLong'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCreate(folderName.trim(), parentId);
      const createdName = folderName.trim();
      setFolderName('');
      showSuccess(t('modals.folderCreatedSuccess').replace('{name}', createdName));
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors.failedToCreateFolder');
      setError(errorMessage);
      // Error toast is handled by Redux middleware
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    setError(null);
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
        'relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-au-gold/20 rounded-lg flex items-center justify-center">
              <Folder size={20} className="text-au-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-au-grey-text">{t('modals.createFolder')}</h2>
              <p className="text-sm text-au-grey-text/70">{t('modals.enterFolderName')}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
              {t('modals.folderName')}
            </label>
            <input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t('modals.enterFolderName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-green focus:border-transparent"
              autoFocus
              disabled={isLoading}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Actions */}
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
              disabled={isLoading || !folderName.trim()}
              className="px-4 py-2 bg-au-green text-au-white rounded-lg hover:bg-au-corporate-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('modals.creating')}</span>
                </>
              ) : (
                <>
                  <Folder size={16} />
                  <span>{t('modals.createFolderButton')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
