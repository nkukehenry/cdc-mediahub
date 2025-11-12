'use client';

import { X, Calendar, Folder, FileText, AlertCircle, CheckCircle, Clock, XCircle, Eye, User, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface PublicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
    category?: {
      id: string;
      name: string;
    };
    publicationDate?: string;
    views?: number;
    creator?: {
      id: string;
      name?: string;
      email?: string;
      username?: string;
    };
    isFeatured?: boolean;
    isLeaderboard?: boolean;
  };
}

export default function PublicationDetailsModal({
  isOpen,
  onClose,
  publication,
}: PublicationDetailsModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const statusConfig = {
    draft: {
      label: 'Draft',
      icon: FileText,
      color: 'bg-gray-100 text-gray-700',
      iconColor: 'text-gray-500',
    },
    pending: {
      label: 'Pending',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-700',
      iconColor: 'text-yellow-500',
    },
    approved: {
      label: 'Published',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700',
      iconColor: 'text-green-500',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      color: 'bg-red-100 text-red-700',
      iconColor: 'text-red-500',
    },
  };

  const status = statusConfig[publication.status];
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className={cn('p-2 rounded-lg', status.color)}>
              <StatusIcon className={cn('size-5', status.iconColor)} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-au-grey-text">Publication Details</h3>
              <p className="text-xs text-au-grey-text/70 mt-0.5">View publication information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-au-grey-text" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <p className="text-base font-medium text-au-grey-text">{publication.title}</p>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5">
              Slug
            </label>
            <p className="text-sm text-au-grey-text/80 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
              {publication.slug}
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium">
              <StatusIcon className={cn('size-4', status.iconColor)} />
              <span className={cn(status.color, 'px-2.5 py-0.5 rounded-full')}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Rejection Reason */}
          {publication.status === 'rejected' && (
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                <AlertCircle className="size-3.5 text-red-500" />
                <span>Rejection Reason</span>
              </label>
              {publication.rejectionReason ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 break-words whitespace-pre-wrap">
                    {publication.rejectionReason}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    No rejection reason provided.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
              <Folder className="size-3.5 text-au-grey-text/50" />
              <span>Category</span>
            </label>
            <p className="text-sm text-au-grey-text">
              {publication.category?.name || '—'}
            </p>
          </div>

          {/* Creator */}
          {publication.creator && (
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                <User className="size-3.5 text-au-grey-text/50" />
                <span>Creator</span>
              </label>
              <p className="text-sm text-au-grey-text">
                {publication.creator.name || publication.creator.username || publication.creator.email || '—'}
              </p>
              {publication.creator.email && publication.creator.email !== (publication.creator.name || publication.creator.username) && (
                <p className="text-xs text-au-grey-text/60 mt-0.5">{publication.creator.email}</p>
              )}
            </div>
          )}

          {/* Flags */}
          {(publication.isFeatured || publication.isLeaderboard) && (
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5">
                Flags
              </label>
              <div className="flex flex-wrap gap-2">
                {publication.isFeatured && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <Star className="size-3 mr-1" />
                    Featured
                  </span>
                )}
                {publication.isLeaderboard && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <TrendingUp className="size-3 mr-1" />
                    Leaderboard
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Views */}
          {publication.views !== undefined && (
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                <Eye className="size-3.5 text-au-grey-text/50" />
                <span>Views</span>
              </label>
              <p className="text-sm text-au-grey-text">
                {publication.views.toLocaleString()}
              </p>
            </div>
          )}

          {/* Description */}
          {publication.description && (
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <p className="text-sm text-au-grey-text/80 whitespace-pre-wrap break-words">
                {publication.description}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                <Calendar className="size-3.5 text-au-grey-text/50" />
                <span>Created</span>
              </label>
              <p className="text-sm text-au-grey-text">
                {new Date(publication.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                <Calendar className="size-3.5 text-au-grey-text/50" />
                <span>Last Updated</span>
              </label>
              <p className="text-sm text-au-grey-text">
                {new Date(publication.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Publication Date */}
          {publication.publicationDate && (
            <div>
              <label className="block text-xs font-semibold text-au-grey-text/70 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                <Calendar className="size-3.5 text-au-grey-text/50" />
                <span>Publication Date</span>
              </label>
              <p className="text-sm text-au-grey-text">
                {new Date(publication.publicationDate).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 md:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-au-grey-text hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

