'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Share2, Search, User, XCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { cn } from '@/utils/fileUtils';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (userIds: string[], accessLevel: 'read' | 'write') => Promise<void>;
  fileId?: string;
  folderId?: string;
}

export default function ShareModal({ isOpen, onClose, onShare, fileId, folderId }: ShareModalProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Default to 'write' for folders, 'read' for files
  const [accessLevel, setAccessLevel] = useState<'read' | 'write'>(folderId ? 'write' : 'read');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load users on mount
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Update access level default when folderId/fileId changes
  useEffect(() => {
    if (folderId) {
      setAccessLevel('write');
    } else {
      setAccessLevel('read');
    }
  }, [folderId, fileId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Load available users
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getUsers();
      if (res.success && res.data?.users) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().trim();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      name.includes(query)
    ) && !selectedUsers.find(su => su.id === user.id);
  });

  // Add user to selection
  const handleAddUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  // Remove user from selection
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  // Handle share submission
  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onShare(selectedUsers.map(u => u.id), accessLevel);
      setSelectedUsers([]);
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get user display name
  const getUserDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
    }
    return user.username;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Share2 className="text-au-green" size={20} />
            <h3 className="text-base font-semibold text-au-grey-text">{t('fileManager.share')}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={16} className="text-au-grey-text" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Multi-select with tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-au-grey-text mb-2">
              {t('fileManager.shareWith')}
            </label>
            
            {/* Selected users as tags */}
            <div className="min-h-[80px] p-2 border border-gray-300 rounded-lg bg-gray-50">
              {selectedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="inline-flex items-center space-x-2 px-2 py-1 bg-au-green text-au-white rounded-md text-sm"
                    >
                      <User size={14} />
                      <span>{getUserDisplayName(user)}</span>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="hover:bg-au-corporate-green rounded"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-au-grey-text/70 py-2">{t('fileManager.selectUsers')}</p>
              )}

              {/* Search input */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center space-x-2">
                  <Search size={16} className="absolute left-3 text-au-grey-text/50" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={t('fileManager.searchUsers')}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-au-green focus:border-transparent"
                  />
                </div>

                {/* Dropdown with user list */}
                {showDropdown && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddUser(user)}
                        className="w-full text-left px-4 py-2 hover:bg-au-gold/10 flex items-center space-x-3 transition-colors"
                      >
                        <div className="w-8 h-8 bg-au-gold/20 rounded-full flex items-center justify-center">
                          <User size={16} className="text-au-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-au-grey-text truncate">
                            {getUserDisplayName(user)}
                          </p>
                          <p className="text-xs text-au-grey-text/70 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchQuery && filteredUsers.length === 0 && !isLoading && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-sm text-au-grey-text/70">
                    {t('fileManager.noUsersFound')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Access level selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-au-grey-text mb-2">
              {t('fileManager.accessLevel')}
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as 'read' | 'write')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-au-green focus:border-transparent"
            >
              <option value="read">{t('fileManager.read')}</option>
              <option value="write">{t('fileManager.write')}</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded border border-gray-300 bg-white text-au-grey-text hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || isSubmitting}
            className={cn(
              'px-3 py-2 text-sm rounded text-au-white bg-au-green hover:bg-au-corporate-green transition-colors',
              (selectedUsers.length === 0 || isSubmitting) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? t('fileManager.sharing') : t('fileManager.share')}
          </button>
        </div>
      </div>
    </div>
  );
}

