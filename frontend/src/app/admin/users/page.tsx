'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, MoreVertical, X, UserPlus, Ban, Unlock, KeyRound, User as UserIcon, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { showSuccess } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { cn, getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';
import { languageNames, type LanguageCode } from '@/locales';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  organization?: string;
  bio?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified?: boolean;
  language?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  roles?: Array<{ id: string; name: string; slug: string }>;
  roleIds?: string[];
}

function UsersPageContent() {
  const { t } = useTranslation();
  const { handleError, showSuccess: showSuccessMessage } = useErrorHandler();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(true);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordFormOpen, setResetPasswordFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string; slug?: string }>>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Create/Edit form fields
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    jobTitle: '',
    organization: '',
    bio: '',
    language: 'en' as LanguageCode,
    isActive: true,
    emailVerified: false,
    roleIds: [] as string[],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Close action menus on outside click
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

  useEffect(() => {
    loadUsers();
  }, [includeInactive]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        setRolesLoading(true);
        const response = await apiClient.getRoles();
        if (response.success && response.data?.roles) {
          setAvailableRoles(response.data.roles);
        } else {
          handleError(new Error(response.error?.message || 'Failed to load roles'));
        }
      } catch (error) {
        handleError(error);
      } finally {
        setRolesLoading(false);
      }
    };
    loadRoles();
  }, [handleError]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUsers(includeInactive);
      
      if (response.success && response.data) {
        let filteredUsers = response.data.users;
        
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filteredUsers = filteredUsers.filter((u: User) => 
            u.username.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query) ||
            (u.firstName && u.firstName.toLowerCase().includes(query)) ||
            (u.lastName && u.lastName.toLowerCase().includes(query))
          );
        }
        
        setUsers(filteredUsers);
      } else {
        handleError(new Error('Failed to load users'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBlock = async (userId: string) => {
    try {
      const response = await apiClient.blockUser(userId);
      if (response.success) {
        showSuccessMessage('User blocked successfully');
        setActionMenuOpen(null);
        loadUsers();
      } else {
        handleError(new Error(response.error?.message || 'Failed to block user'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      const response = await apiClient.unblockUser(userId);
      if (response.success) {
        showSuccessMessage('User unblocked successfully');
        setActionMenuOpen(null);
        loadUsers();
      } else {
        handleError(new Error(response.error?.message || 'Failed to unblock user'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleResetPassword = async (userId: string, newPassword?: string) => {
    try {
      setResetting(true);
      const response = await apiClient.resetUserPassword(userId, newPassword);
      if (response.success) {
        if (response.data?.tempPassword) {
          setTempPassword(response.data.tempPassword);
          setSelectedUser(users.find(u => u.id === userId) || null);
          setResetPasswordModalOpen(true);
        } else {
          showSuccessMessage('Password reset successfully');
        }
        setActionMenuOpen(null);
        setResetPasswordFormOpen(false);
      } else {
        handleError(new Error(response.error?.message || 'Failed to reset password'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setResetting(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      jobTitle: '',
      organization: '',
      bio: '',
      language: 'en' as LanguageCode,
      isActive: true,
      emailVerified: false,
      roleIds: [],
    });
    setFormErrors({});
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      jobTitle: user.jobTitle || '',
      organization: user.organization || '',
      bio: user.bio || '',
      language: (user.language || 'en') as LanguageCode,
      isActive: user.isActive,
      emailVerified: user.emailVerified || false,
      roleIds: (user.roleIds && user.roleIds.length > 0)
        ? user.roleIds
        : (user.roles ? user.roles.map(role => role.id) : []),
    });
    setFormErrors({});
    setEditModalOpen(true);
    setActionMenuOpen(null);
  };

  const handleOpenResetPassword = (user: User) => {
    setSelectedUser(user);
    setResetPasswordFormOpen(true);
    setActionMenuOpen(null);
  };

  const validateForm = (isEdit: boolean = false): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!isEdit && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!isEdit && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm(false)) return;

    try {
      setSaving(true);
      const response = await apiClient.createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
        organization: formData.organization.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        language: formData.language,
        isActive: formData.isActive,
        emailVerified: formData.emailVerified,
        roleIds: formData.roleIds,
      });

      if (response.success) {
        showSuccessMessage('User created successfully');
        setCreateModalOpen(false);
        loadUsers();
      } else {
        handleError(new Error(response.error?.message || 'Failed to create user'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser || !validateForm(true)) return;

    try {
      setSaving(true);
      const updateData: any = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
        organization: formData.organization.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        language: formData.language,
        isActive: formData.isActive,
        emailVerified: formData.emailVerified,
        roleIds: formData.roleIds,
      };

      const response = await apiClient.updateUser(selectedUser.id, updateData);

      if (response.success) {
        showSuccessMessage('User updated successfully');
        setEditModalOpen(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        handleError(new Error(response.error?.message || 'Failed to update user'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiClient.deleteUser(userId);
      if (response.success) {
        showSuccessMessage('User deleted successfully');
        setActionMenuOpen(null);
        loadUsers();
      } else {
        handleError(new Error(response.error?.message || 'Failed to delete user'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const toggleRoleSelection = (roleId: string) => {
    setFormData((prev) => {
      const isSelected = prev.roleIds.includes(roleId);
      const nextRoleIds = isSelected
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId];
      return { ...prev, roleIds: nextRoleIds };
    });
  };

  const setMenuRef = (userId: string, element: HTMLDivElement | null) => {
    if (element) {
      menuRefs.current.set(userId, element);
    } else {
      menuRefs.current.delete(userId);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-au-grey-text">{t('common.loading')}...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text">{t('nav.users')}</h1>
          <button
            onClick={handleOpenCreate}
            className="px-3 md:px-4 py-2 text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center space-x-2 self-start sm:self-auto"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">Create User</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-au-grey-text">Include inactive</span>
          </label>
        </div>

        {/* Users Table */}
        {users.length === 0 && !loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8 text-center">
            <p className="text-sm md:text-base text-au-grey-text/70">No users found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.avatar ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                              <img
                                src={getImageUrl(user.avatar)}
                                alt={user.firstName || user.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-au-gold flex items-center justify-center text-white font-medium text-sm mr-3 flex-shrink-0">
                              {(user.firstName?.[0] || user.username[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-au-grey-text">
                              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                            </div>
                            {user.jobTitle && (
                              <div className="text-xs text-gray-500">{user.jobTitle}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-au-grey-text">{user.email}</div>
                        {user.emailVerified && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <CheckCircle2 size={12} />
                            Verified
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Blocked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block" ref={(el) => setMenuRef(user.id, el)}>
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical size={18} className="text-gray-400" />
                          </button>
                          {actionMenuOpen === user.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              {user.isActive ? (
                                <button
                                  onClick={() => handleBlock(user.id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Ban size={14} />
                                  Block User
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnblock(user.id)}
                                  className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <Unlock size={14} />
                                  Unblock User
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(user)}
                                className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit size={14} />
                                Edit User
                              </button>
                              <button
                                onClick={() => handleOpenResetPassword(user)}
                                className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-gray-50 flex items-center gap-2"
                              >
                                <KeyRound size={14} />
                                Reset Password
                              </button>
                              {currentUser?.id !== user.id && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  Delete User
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetPasswordModalOpen && tempPassword && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-au-grey-text">Password Reset</h3>
                <button
                  onClick={() => {
                    setResetPasswordModalOpen(false);
                    setTempPassword(null);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-au-grey-text mb-2">
                  A temporary password has been generated for <strong>{selectedUser.firstName || selectedUser.username}</strong>:
                </p>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <code className="text-sm font-mono text-au-grey-text break-all">{tempPassword}</code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Please share this password with the user securely. They should change it after logging in.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    showSuccessMessage('Password copied to clipboard');
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 text-au-grey-text rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Copy Password
                </button>
                <button
                  onClick={() => {
                    setResetPasswordModalOpen(false);
                    setTempPassword(null);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-au-grey-text">Create User</h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none",
                        formErrors.username ? "border-red-500" : "border-gray-300"
                      )}
                    />
                    {formErrors.username && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none",
                        formErrors.email ? "border-red-500" : "border-gray-300"
                      )}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none",
                        formErrors.password ? "border-red-500" : "border-gray-300"
                      )}
                    />
                    {formErrors.password && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none",
                        formErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                      )}
                    />
                    {formErrors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value as LanguageCode })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    >
                      {Object.entries(languageNames).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    Roles
                  </label>
                  {rolesLoading ? (
                    <p className="text-sm text-au-grey-text/70">Loading roles...</p>
                  ) : availableRoles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableRoles.map((role) => (
                        <label key={role.id} className="flex items-center gap-2 text-sm text-au-grey-text">
                          <input
                            type="checkbox"
                            checked={formData.roleIds.includes(role.id)}
                            onChange={() => toggleRoleSelection(role.id)}
                            className="rounded"
                          />
                          <span>{role.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-au-grey-text/70">No roles available.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-au-grey-text">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.emailVerified}
                      onChange={(e) => setFormData({ ...formData, emailVerified: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-au-grey-text">Email Verified</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-au-grey-text rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Create User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-au-grey-text">Edit User</h3>
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none",
                        formErrors.username ? "border-red-500" : "border-gray-300"
                      )}
                    />
                    {formErrors.username && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none",
                        formErrors.email ? "border-red-500" : "border-gray-300"
                      )}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-1">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value as LanguageCode })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                    >
                      {Object.entries(languageNames).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    Roles
                  </label>
                  {rolesLoading ? (
                    <p className="text-sm text-au-grey-text/70">Loading roles...</p>
                  ) : availableRoles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableRoles.map((role) => (
                        <label key={role.id} className="flex items-center gap-2 text-sm text-au-grey-text">
                          <input
                            type="checkbox"
                            checked={formData.roleIds.includes(role.id)}
                            onChange={() => toggleRoleSelection(role.id)}
                            className="rounded"
                          />
                          <span>{role.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-au-grey-text/70">No roles available.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-au-grey-text">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.emailVerified}
                      onChange={(e) => setFormData({ ...formData, emailVerified: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-au-grey-text">Email Verified</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 text-au-grey-text rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Form Modal */}
        {resetPasswordFormOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-au-grey-text">Reset Password</h3>
                <button
                  onClick={() => {
                    setResetPasswordFormOpen(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-au-grey-text mb-4">
                  Reset password for <strong>{selectedUser.firstName || selectedUser.username}</strong> ({selectedUser.email})
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Leave the password field empty to generate a random temporary password, or enter a new password.
                </p>
                <div>
                  <label className="block text-sm font-medium text-au-grey-text mb-1">
                    New Password (optional)
                  </label>
                  <input
                    type="password"
                    id="newPasswordInput"
                    placeholder="Leave empty for auto-generated password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-gold focus:border-au-gold outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setResetPasswordFormOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 text-au-grey-text rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('newPasswordInput') as HTMLInputElement;
                    const newPassword = input?.value.trim() || undefined;
                    handleResetPassword(selectedUser.id, newPassword);
                  }}
                  disabled={resetting}
                  className="px-4 py-2 text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {resetting && <Loader2 size={16} className="animate-spin" />}
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return <UsersPageContent />;
}

