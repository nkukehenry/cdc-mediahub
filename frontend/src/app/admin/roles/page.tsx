'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Shield, KeyRound, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useAuth } from '@/hooks/useAuth';

interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function RolesPage() {
  const { t } = useTranslation();
  const { handleError, showSuccess: showSuccessMessage } = useErrorHandler();
  const { user, loading: authLoading } = useAuth();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });
  
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getRoles();
      if (response.success && response.data?.roles) {
        setRoles(response.data.roles);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const loadPermissions = useCallback(async () => {
    try {
      const response = await apiClient.getPermissions();
      if (response.success && response.data?.permissions) {
        setPermissions(response.data.permissions);
      }
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const handleCreate = () => {
    setFormData({ name: '', slug: '', description: '' });
    setFormErrors({});
    setCreateModalOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      slug: role.slug,
      description: role.description || '',
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleAssignPermissions = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissionIds(role.permissions?.map(p => p.id) || []);
    setPermissionsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      const response = await apiClient.createRole({
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || undefined,
      });
      
      if (response.success) {
        showSuccessMessage('Role created successfully');
        setCreateModalOpen(false);
        loadRoles();
      } else {
        handleError(new Error(response.error?.message || 'Failed to create role'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm() || !selectedRole) return;
    
    try {
      setSaving(true);
      const response = await apiClient.updateRole(selectedRole.id, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || undefined,
      });
      
      if (response.success) {
        showSuccessMessage('Role updated successfully');
        setEditModalOpen(false);
        loadRoles();
      } else {
        handleError(new Error(response.error?.message || 'Failed to update role'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }
    
    try {
      const response = await apiClient.deleteRole(role.id);
      if (response.success) {
        showSuccessMessage('Role deleted successfully');
        loadRoles();
      } else {
        handleError(new Error(response.error?.message || 'Failed to delete role'));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      setSaving(true);
      const response = await apiClient.assignPermissionsToRole(selectedRole.id, selectedPermissionIds);
      if (response.success) {
        showSuccessMessage('Permissions updated successfully');
        setPermissionsModalOpen(false);
        loadRoles();
      } else {
        handleError(new Error(response.error?.message || 'Failed to update permissions'));
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-au-grey-text">Roles & Permissions</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Role
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-au-corporate-green"></div>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No roles found matching your search' : 'No roles found. Create your first role.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-au-grey-text">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-au-grey-text">Slug</th>
                    <th className="text-left py-3 px-4 font-semibold text-au-grey-text">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-au-grey-text">Permissions</th>
                    <th className="text-right py-3 px-4 font-semibold text-au-grey-text">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => (
                    <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-au-corporate-green" />
                          <span className="font-medium text-au-grey-text">{role.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">{role.slug}</td>
                      <td className="py-3 px-4 text-gray-600">{role.description || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          <KeyRound className="w-4 h-4" />
                          {role.permissions?.length || 0} permissions
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAssignPermissions(role)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Manage Permissions"
                          >
                            <KeyRound className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(role)}
                            className="p-2 text-au-corporate-green hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Role"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(role)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Create Role Modal */}
      {createModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-au-grey-text">Create Role</h2>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
                      placeholder="e.g., Editor"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-2">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent font-mono text-sm"
                      placeholder="e.g., editor"
                    />
                    {formErrors.slug && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.slug}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-au-grey-text hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitCreate}
                    disabled={saving}
                    className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? 'Creating...' : 'Create Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Edit Role Modal */}
      {editModalOpen && selectedRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-au-grey-text">Edit Role</h2>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-2">
                      Slug *
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent font-mono text-sm"
                    />
                    {formErrors.slug && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.slug}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-au-grey-text mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-au-grey-text hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Permissions Assignment Modal */}
      {permissionsModalOpen && selectedRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-au-grey-text">
                    Manage Permissions - {selectedRole.name}
                  </h2>
                  <button
                    onClick={() => setPermissionsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Select the permissions to assign to this role. Users with this role will have all selected permissions.
                  </p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {permissions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No permissions available. Create permissions first.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissionIds.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="mt-1 w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-corporate-green"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-au-grey-text">{permission.name}</div>
                            <div className="text-sm text-gray-500 font-mono">{permission.slug}</div>
                            {permission.description && (
                              <div className="text-sm text-gray-600 mt-1">{permission.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    {selectedPermissionIds.length} of {permissions.length} permissions selected
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPermissionsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-au-grey-text hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

