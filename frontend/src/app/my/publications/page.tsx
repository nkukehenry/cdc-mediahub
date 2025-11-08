'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Eye, Edit } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { showError } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

interface PublicationListItem {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
}

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type TabKey = 'all' | 'draft' | 'pending' | 'approved' | 'rejected';

const PAGE_SIZE = 10;

export default function MyPublicationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [pages, setPages] = useState<Record<TabKey, number>>({
    all: 1,
    draft: 1,
    pending: 1,
    approved: 1,
    rejected: 1,
  });
  const [publications, setPublications] = useState<PublicationListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/my/publications');
    }
  }, [loading, user, router]);

  const tabs = useMemo<{ key: TabKey; label: string }[]>(
    () => [
      { key: 'all', label: 'All' },
      { key: 'draft', label: 'Draft' },
      { key: 'pending', label: 'Pending' },
      { key: 'approved', label: 'Published' },
      { key: 'rejected', label: 'Rejected' },
    ],
    []
  );

  useEffect(() => {
    const loadPublications = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const page = pages[activeTab];
        const filters = activeTab === 'all' ? {} : { status: activeTab };
        const response = await apiClient.getPublications(filters, page, PAGE_SIZE);

        if (response.success && response.data?.publications) {
          setPublications(response.data.publications as PublicationListItem[]);
          if (response.data.pagination) {
            setPagination(response.data.pagination as PaginationState);
          } else {
            setPagination({ total: response.data.publications.length, page, limit: PAGE_SIZE, totalPages: 1 });
          }
          setError(null);
        } else {
          const message = response.error?.message || 'Failed to load publications';
          setError(message);
          setPublications([]);
          showError(message);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load publications';
        setError(message);
        setPublications([]);
        showError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPublications();
  }, [user, activeTab, pages]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPages(prev => ({ ...prev, [tab]: 1 }));
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    setPages(prev => {
      const current = prev[activeTab];
      if (direction === 'prev' && current > 1) {
        return { ...prev, [activeTab]: current - 1 };
      }
      if (direction === 'next' && current < pagination.totalPages) {
        return { ...prev, [activeTab]: current + 1 };
      }
      return prev;
    });
  };

  const statusLabel = (status: PublicationListItem['status']) => {
    if (status === 'approved') return 'Published';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!user && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNav />

      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-au-grey-text">My Publications</h1>
            <p className="text-sm text-au-grey-text/70 mt-1">
              Draft, submit, and track the status of your publications.
            </p>
          </div>
          <Link
            href="/my/publications/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-au-green text-white text-sm font-medium hover:bg-au-corporate-green transition-colors"
          >
            <Plus size={16} />
            New Publication
          </Link>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-au-green text-au-green'
                    : 'border-transparent text-au-grey-text/70 hover:text-au-grey-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-au-grey-text" />
            <span className="ml-2 text-sm text-au-grey-text/70">Loading publications…</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : publications.length === 0 ? (
          <div className="bg-white border border-dashed border-au-grey-text/30 rounded-xl p-12 text-center">
            <h2 className="text-lg font-medium text-au-grey-text mt-4">No publications found</h2>
            <p className="text-sm text-au-grey-text/70 mt-2">
              {activeTab === 'all'
                ? 'You have not created any publications yet.'
                : `You have no ${tabs.find(t => t.key === activeTab)?.label?.toLowerCase()} publications.`}
            </p>
            <Link
              href="/my/publications/new"
              className="inline-flex items-center justify-center gap-2 mt-6 px-4 py-2 rounded-lg bg-au-green text-white text-sm font-medium hover:bg-au-corporate-green transition-colors"
            >
              <Plus size={16} />
              Create publication
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {publications.map(pub => (
                    <tr key={pub.id}>
                      <td className="px-4 py-3 text-sm text-au-grey-text">
                        <div className="font-medium text-au-grey-text">{pub.title}</div>
                        <div className="text-xs text-au-grey-text/60">Slug: {pub.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-au-grey-text/80">
                        {pub.category?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          pub.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : pub.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : pub.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {statusLabel(pub.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-au-grey-text/80">
                        {new Date(pub.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/publication/${pub.slug}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-au-grey-text bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Eye size={14} />
                            View
                          </Link>
                          <Link
                            href={`/my/publications/${pub.id}/edit`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-au-green bg-au-green/10 rounded-lg hover:bg-au-green/20 transition-colors"
                          >
                            <Edit size={14} />
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-au-grey-text/70">
                Showing {publications.length} of {pagination.total} publications
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange('prev')}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-au-grey-text hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-au-grey-text/70">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange('next')}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-au-grey-text hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
