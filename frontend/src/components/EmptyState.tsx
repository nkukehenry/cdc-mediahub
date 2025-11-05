'use client';

import { Folder, Upload, FolderPlus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/utils/fileUtils';

interface EmptyStateProps {
  type?: 'folder' | 'root';
  icon?: 'folder' | 'upload' | 'folderPlus';
  title?: string;
  description?: string;
  className?: string;
}

export default function EmptyState({ 
  type = 'folder',
  icon = 'folder',
  title,
  description,
  className 
}: EmptyStateProps) {
  const { t } = useTranslation();

  // Get icon component
  const getIcon = () => {
    const iconSize = 28;
    const iconClass = type === 'root' ? 'text-au-green' : 'text-au-green';
    
    switch (icon) {
      case 'upload':
        return <Upload size={iconSize} className={iconClass} />;
      case 'folderPlus':
        return <FolderPlus size={iconSize} className={iconClass} />;
      case 'folder':
      default:
        return <Folder size={iconSize} className={iconClass} />;
    }
  };

  // Get default title and description based on type
  const getTitle = () => {
    if (title) return title;
    return type === 'root' 
      ? t('fileManager.emptyRoot.title') 
      : t('fileManager.emptyFolder.title');
  };

  const getDescription = () => {
    if (description) return description;
    return type === 'root'
      ? t('fileManager.emptyRoot.description')
      : t('fileManager.emptyFolder.description');
  };

  return (
    <div className={cn('flex flex-col items-center justify-center py-20', className)}>
      <div className={cn(
        'w-16 h-16 bg-au-gold/20 rounded-xl flex items-center justify-center mb-4',
        'transition-transform hover:scale-105'
      )}>
        {getIcon()}
      </div>
      <p className="text-base font-medium text-au-grey-text mb-1">
        {getTitle()}
      </p>
      <p className="text-sm text-au-grey-text/70 text-center max-w-md">
        {getDescription()}
      </p>
    </div>
  );
}

