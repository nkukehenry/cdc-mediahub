'use client';

import { X, Trash2 } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  count: number;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  count,
  title,
  message,
  confirmLabel,
  cancelLabel
}: ConfirmDeleteModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const defaultMessage = `Are you sure you want to delete ${count} ${count === 1 ? t('modals.deleteItem') : t('modals.deleteItems')}? Only empty folders can be deleted. This action cannot be undone.`;
  const defaultTitle = t('modals.confirmDelete');
  const defaultConfirmLabel = t('common.delete');
  const defaultCancelLabel = t('common.cancel');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Trash2 className="text-au-red" size={20} />
            <h3 className="text-base font-semibold text-au-grey-text">{title || defaultTitle}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={16} className="text-au-grey-text" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-au-grey-text">
            {message || defaultMessage}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded border border-gray-300 bg-white text-au-grey-text hover:bg-gray-50">{cancelLabel || defaultCancelLabel}</button>
          <button
            onClick={async () => {
              await onConfirm();
              // Don't close here - let the parent component close after refresh
            }}
            className={cn('px-3 py-2 text-sm rounded text-au-white bg-au-red hover:bg-red-700')}
          >
            {confirmLabel || defaultConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


