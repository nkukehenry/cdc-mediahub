'use client';

import { useMemo, useState } from 'react';
import { X, Folder, ChevronRight, Move } from 'lucide-react';
import { FolderWithFiles } from '@/types/fileManager';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destinationFolderId: string | null) => Promise<void> | void;
  folders: FolderWithFiles[];
}

export default function MoveModal({ isOpen, onClose, onConfirm, folders }: MoveModalProps) {
  const { t } = useTranslation();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const renderFolder = (folder: FolderWithFiles, level = 0) => {
    return (
      <div key={folder.id} className={cn('flex items-center p-2 rounded cursor-pointer hover:bg-au-gold/10', selectedFolderId === folder.id && 'bg-au-gold/20')}
           onClick={() => setSelectedFolderId(folder.id)}>
        <div className="flex items-center" style={{ marginLeft: level * 12 }}>
          <Folder size={16} className="text-au-green mr-2" />
          <span className="text-sm text-au-grey-text">{folder.name}</span>
        </div>
      </div>
    );
  };

  const renderTree = (nodes: FolderWithFiles[], level = 0): React.ReactElement[] => {
    const list: React.ReactElement[] = [];
    nodes.forEach((f) => {
      list.push(renderFolder(f, level));
      if (f.subfolders && f.subfolders.length) {
        list.push(...renderTree(f.subfolders, level + 1));
      }
    });
    return list;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Move className="text-au-green" size={20} />
            <h3 className="text-base font-semibold text-au-grey-text">{t('modals.moveTo')}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={16} className="text-au-grey-text" />
          </button>
        </div>
        <div className="p-4">
          <div className="mb-3">
            <button
              className={cn('px-2 py-1 text-xs rounded border', selectedFolderId === null ? 'border-au-green text-au-green' : 'border-gray-300 text-au-grey-text hover:bg-gray-50')}
              onClick={() => setSelectedFolderId(null)}
            >
                {t('fileManager.home')}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto border rounded">
            {renderTree(folders)}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded border border-gray-300 bg-white text-au-grey-text hover:bg-gray-50">{t('common.cancel')}</button>
          <button
            onClick={async () => {
              await onConfirm(selectedFolderId);
              // Don't close here - let the parent component close after refresh
            }}
            className={cn('px-3 py-2 text-sm rounded text-au-white bg-au-green hover:bg-au-corporate-green')}
          >
            {t('modals.moveHere')}
          </button>
        </div>
      </div>
    </div>
  );
}


