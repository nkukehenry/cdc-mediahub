'use client';

import { useState, useEffect } from 'react';
import { X, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface NavLink {
  id: string;
  label: string;
  url?: string;
  route?: string;
  external: boolean;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NavLinkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { label: string; url?: string; route?: string; external?: boolean; order?: number; isActive?: boolean }) => Promise<void>;
  navLink?: NavLink | null;
  className?: string;
}

export default function NavLinkFormModal({
  isOpen,
  onClose,
  onSubmit,
  navLink,
  className
}: NavLinkFormModalProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [route, setRoute] = useState('');
  const [external, setExternal] = useState(false);
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!navLink;

  useEffect(() => {
    if (navLink) {
      setLabel(navLink.label);
      setUrl(navLink.url || '');
      setRoute(navLink.route || '');
      setExternal(navLink.external);
      setOrder(navLink.order);
      setIsActive(navLink.isActive);
    } else {
      setLabel('');
      setUrl('');
      setRoute('');
      setExternal(false);
      setOrder(0);
      setIsActive(true);
    }
    setError(null);
  }, [navLink, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!label.trim()) {
      setError('Label is required');
      return;
    }

    if (!external && !url && !route) {
      setError(t('navLinks.eitherUrlOrRoute'));
      return;
    }

    if (external && !url) {
      setError('External URL is required for external links');
      return;
    }

    if (!external && !route) {
      setError('Internal route is required for internal links');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode) {
        await onSubmit({ label, url: url || undefined, route: route || undefined, external, order, isActive });
      } else {
        await onSubmit({ label, url: url || undefined, route: route || undefined, external, order, isActive });
      }
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to save nav link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExternalChange = (checked: boolean) => {
    setExternal(checked);
    if (checked) {
      setRoute(''); // Clear route if switching to external
    } else {
      setUrl(''); // Clear URL if switching to internal
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={cn("bg-white rounded-lg shadow-xl w-full max-w-2xl", className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5 text-au-grey-text" />
            <h2 className="text-lg font-semibold text-au-grey-text">
              {isEditMode ? t('navLinks.editNavLink') : t('navLinks.createNavLink')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-au-grey-text" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Label */}
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-au-grey-text mb-1">
              {t('navLinks.label')} *
            </label>
            <input
              type="text"
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('navLinks.enterLabel')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500">{t('navLinks.labelHelper')}</p>
          </div>

          {/* External Checkbox */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={external}
                onChange={(e) => handleExternalChange(e.target.checked)}
                className="w-4 h-4 text-au-gold border-gray-300 rounded focus:ring-au-gold"
              />
              <span className="text-sm font-medium text-au-grey-text">{t('navLinks.external')}</span>
            </label>
            <p className="mt-1 text-xs text-gray-500">{t('navLinks.externalHelper')}</p>
          </div>

          {/* URL or Route based on external */}
          {external ? (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-au-grey-text mb-1">
                {t('navLinks.url')} *
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('navLinks.enterUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">{t('navLinks.urlHelper')}</p>
            </div>
          ) : (
            <div>
              <label htmlFor="route" className="block text-sm font-medium text-au-grey-text mb-1">
                {t('navLinks.route')} *
              </label>
              <input
                type="text"
                id="route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder={t('navLinks.enterRoute')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">{t('navLinks.routeHelper')}</p>
            </div>
          )}

          {/* Order and Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="order" className="block text-sm font-medium text-au-grey-text mb-1">
                {t('navLinks.order')}
              </label>
              <input
                type="number"
                id="order"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">{t('navLinks.orderHelper')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-au-grey-text mb-1">
                {t('navLinks.isActive')}
              </label>
              <label className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-au-gold border-gray-300 rounded focus:ring-au-gold"
                />
                <span className="text-sm text-au-grey-text">{t('navLinks.isActiveHelper')}</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-au-corporate-green rounded-lg hover:bg-au-corporate-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

