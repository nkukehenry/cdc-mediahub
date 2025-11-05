'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Link as LinkIcon, MoreVertical } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { showSuccess } from '@/utils/errorHandler';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import NavLinkFormModal from '@/components/NavLinkFormModal';
import { cn } from '@/utils/fileUtils';

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

export default function NavLinksPage() {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [filteredNavLinks, setFilteredNavLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNavLink, setSelectedNavLink] = useState<NavLink | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadNavLinks();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNavLinks(navLinks);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNavLinks(
        navLinks.filter(
          (link) =>
            link.label.toLowerCase().includes(query) ||
            (link.url && link.url.toLowerCase().includes(query)) ||
            (link.route && link.route.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, navLinks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let clickedOutside = true;

      menuRefs.current.forEach((menu) => {
        if (menu && menu.contains(target)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        setActionMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNavLinks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllNavLinks();
      
      if (response.success && response.data?.navLinks) {
        setNavLinks(response.data.navLinks);
      } else {
        handleError(new Error('Failed to load nav links'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { label: string; url?: string; route?: string; external?: boolean; order?: number; isActive?: boolean }) => {
    try {
      const response = await apiClient.createNavLink(data);
      
      if (response.success && response.data?.navLink) {
        showSuccess(t('navLinks.navLinkCreated'));
        await loadNavLinks();
        return;
      } else {
        throw new Error(response.error?.message || 'Failed to create nav link');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleEdit = async (data: { label?: string; url?: string; route?: string; external?: boolean; order?: number; isActive?: boolean }) => {
    if (!selectedNavLink) return;

    try {
      const response = await apiClient.updateNavLink(selectedNavLink.id, data);
      
      if (response.success && response.data?.navLink) {
        showSuccess(t('navLinks.navLinkUpdated'));
        await loadNavLinks();
        return;
      } else {
        throw new Error(response.error?.message || 'Failed to update nav link');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!selectedNavLink) return;

    try {
      const response = await apiClient.deleteNavLink(selectedNavLink.id);
      
      if (response.success && response.data?.deleted) {
        showSuccess(t('navLinks.navLinkDeleted'));
        await loadNavLinks();
        setIsDeleteModalOpen(false);
        setSelectedNavLink(null);
      } else {
        throw new Error(response.error?.message || 'Failed to delete nav link');
      }
    } catch (error) {
      handleError(error);
    }
  };

  const openEditModal = (navLink: NavLink) => {
    setSelectedNavLink(navLink);
    setIsEditModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (navLink: NavLink) => {
    setSelectedNavLink(navLink);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(null);
  };

  const toggleActionMenu = (navLinkId: string) => {
    setActionMenuOpen(actionMenuOpen === navLinkId ? null : navLinkId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-au-grey-text">{t('navLinks.title')}</h1>
            <p className="text-sm text-au-grey-text/70 mt-1">
              {navLinks.length} {navLinks.length === 1 ? t('navLinks.navLinkCount') : t('navLinks.navLinkCountPlural')}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            <span>{t('navLinks.createNew')}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('navLinks.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none transition-colors"
            />
          </div>
        </div>

        {/* Nav Links Table */}
        {filteredNavLinks.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <LinkIcon className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-au-grey-text mb-2">
              {searchQuery ? t('navLinks.noNavLinksFound') : t('navLinks.noNavLinks')}
            </h3>
            <p className="text-sm text-au-grey-text/70 mb-6">
              {searchQuery 
                ? t('navLinks.tryAdjustingSearch')
                : t('navLinks.noNavLinksDescription')
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
              >
                <Plus size={20} />
                <span>{t('navLinks.createNew')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-2 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-au-grey-text">
                <div className="col-span-3">{t('navLinks.label')}</div>
                <div className="col-span-2">{t('navLinks.type')}</div>
                <div className="col-span-3">{t('navLinks.linkTo')}</div>
                <div className="col-span-1 text-center">{t('navLinks.order')}</div>
                <div className="col-span-1 text-center">{t('navLinks.isActive')}</div>
                <div className="col-span-2">{t('navLinks.actions')}</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="max-h-96 overflow-y-auto">
              {filteredNavLinks.map((link) => (
                <div 
                  key={link.id} 
                  className="px-6 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 flex items-center space-x-2">
                      <LinkIcon size={16} className="text-au-grey-text/60 flex-shrink-0" />
                      <button 
                        className="text-sm font-medium text-au-grey-text hover:text-au-green text-left truncate"
                        onClick={() => openEditModal(link)}
                        title={link.label}
                      >
                        {link.label}
                      </button>
                    </div>
                    <div className="col-span-2">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded",
                        link.external ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      )}>
                        {link.external ? 'External' : 'Internal'}
                      </span>
                    </div>
                    <div className="col-span-3 text-xs text-au-grey-text/70 font-mono truncate" title={link.url || link.route}>
                      {link.url || link.route || '-'}
                    </div>
                    <div className="col-span-1 text-center text-xs text-au-grey-text/70">
                      {link.order}
                    </div>
                    <div className="col-span-1 text-center">
                      {link.isActive ? (
                        <span className="text-xs text-green-600 font-medium">{t('common.yes')}</span>
                      ) : (
                        <span className="text-xs text-gray-400">{t('common.no')}</span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(link)}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <div className="relative" ref={(el) => {
                        if (el) menuRefs.current.set(link.id, el);
                      }}>
                        <button
                          onClick={() => toggleActionMenu(link.id)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          <MoreVertical size={12} className="text-gray-400" />
                        </button>
                        {actionMenuOpen === link.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => openDeleteModal(link)}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 size={14} />
                              <span>{t('common.delete')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Modal */}
        <NavLinkFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreate}
        />

        {/* Edit Modal */}
        <NavLinkFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedNavLink(null);
          }}
          onSubmit={handleEdit}
          navLink={selectedNavLink}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedNavLink(null);
          }}
          onConfirm={handleDelete}
          count={1}
          title={t('navLinks.deleteNavLink')}
          message={t('navLinks.confirmDeleteDescription')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
        />
      </div>
    </div>
  );
}

