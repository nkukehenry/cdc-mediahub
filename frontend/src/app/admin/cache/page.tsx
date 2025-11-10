'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiClient } from '@/utils/apiClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Trash2, RefreshCw, Search } from 'lucide-react';

interface CacheKey {
  key: string;
  ttl: number | null;
  type: string;
}

function CachePageContent() {
  const { t } = useTranslation();
  const { handleError, showSuccess } = useErrorHandler();
  const [keys, setKeys] = useState<CacheKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [searchPattern, setSearchPattern] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async (pattern?: string) => {
    try {
      setKeysLoading(true);
      const effectivePattern = pattern ?? (searchPattern.trim() ? searchPattern.trim() : '*');
      const response = await apiClient.getCacheKeys(effectivePattern, 100);
      if (response.success && response.data) {
        setKeys(response.data.keys);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setKeysLoading(false);
    }
  };

  const handleSearch = () => {
    loadKeys(searchPattern.trim() ? searchPattern.trim() : '*');
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Are you sure you want to delete cache key "${key}"?`)) {
      return;
    }

    try {
      const response = await apiClient.deleteCacheKey(key);
      if (response.success) {
        showSuccess('Cache key deleted successfully');
        loadKeys(searchPattern);
      }
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text">{t('nav.cache')}</h1>
        <button
          onClick={() => loadKeys('*')}
          className="px-4 py-2 text-sm bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchPattern}
              onChange={(e) => setSearchPattern(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter cache pattern (e.g. mutindo:filemanager:*)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={keysLoading}
            className="px-4 py-2 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-colors disabled:opacity-50"
          >
            {keysLoading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Cache Keys List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-au-grey-text">Cache Keys</h2>
        </div>
        {keysLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No cache keys found matching pattern "{searchPattern}"
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keys.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono break-all">
                      {item.key}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteKey(item.key)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-2"
                        title="Delete key"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-sm">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CachePage() {
  return <CachePageContent />;
}
