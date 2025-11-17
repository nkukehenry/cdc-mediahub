'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchDashboardAnalytics } from '@/store/analyticsSlice';
import { RootState, AppDispatch } from '@/store';
import { Users, FileText, FolderTree, Eye, TrendingUp, BarChart3, Award, Crown, Calendar, Activity, MessageSquare, Clock } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import Link from 'next/link';

// Dashboard components
import StatCard from './dashboard/StatCard';
import ChartCard from './dashboard/ChartCard';
import PieChartCard from './dashboard/PieChartCard';
import BarChartCard from './dashboard/BarChartCard';
import AreaChartCard from './dashboard/AreaChartCard';
import DataTable from './dashboard/DataTable';

interface Comment {
  id: string;
  postId: string;
  authorName?: string | null;
  content: string;
  createdAt: Date | string;
  post?: {
    id: string;
    title: string;
    slug?: string;
  };
}

function DashboardContent() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { analytics, loading, error } = useSelector((state: RootState) => state.analytics);
  const [recentComments, setRecentComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchDashboardAnalytics());
    
    // Fetch recent comments
    const loadRecentComments = async () => {
      try {
        setCommentsLoading(true);
        const response = await apiClient.getRecentComments(5);
        if (response.success && response.data) {
          setRecentComments(response.data.comments || []);
        }
      } catch (err) {
        console.error('Failed to load recent comments:', err);
      } finally {
        setCommentsLoading(false);
      }
    };
    
    loadRecentComments();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('admin.noData')}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h2 className="text-2xl font-bold text-au-grey-text mb-6">{t('admin.overview')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label={t('admin.totalUsers')}
            value={formatNumber(analytics.overview.totalUsers)}
            icon={<Users className="h-5 w-5 text-au-corporate-green" />}
          />
          
          <StatCard
            label={t('admin.totalPosts')}
            value={formatNumber(analytics.overview.totalPosts)}
            icon={<FileText className="h-5 w-5 text-blue-500" />}
          />
          
          <StatCard
            label={t('admin.totalCategories')}
            value={formatNumber(analytics.overview.totalCategories)}
            icon={<FolderTree className="h-5 w-5 text-purple-500" />}
          />
          
          <StatCard
            label={t('admin.totalSubcategories')}
            value={formatNumber(analytics.overview.totalSubcategories)}
            icon={<BarChart3 className="h-5 w-5 text-orange-500" />}
          />
          
          <StatCard
            label={t('admin.totalViews')}
            value={formatNumber(analytics.overview.totalViews)}
            icon={<Eye className="h-5 w-5 text-green-500" />}
          />
          
          <StatCard
            label={t('admin.totalUniqueHits')}
            value={formatNumber(analytics.overview.totalUniqueHits)}
            icon={<TrendingUp className="h-5 w-5 text-red-500" />}
          />
        </div>
      </div>

      {/* Publication Stats and User Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Publication Stats */}
        <ChartCard title={t('admin.publicationStats')}>
          <div className="space-y-6">
            {/* Publications by Status - Pie Chart */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{t('admin.byStatus')}</h3>
              <PieChartCard
                title=""
                data={analytics.publicationStats.byStatus.map(item => ({ name: item.status, count: item.count }))}
                dataKey="count"
                nameKey="name"
                height={220}
              />
            </div>
            
            {/* Publications by Category - Bar Chart */}
            <div className="pt-6 border-t-2 border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{t('admin.byCategory')}</h3>
              <BarChartCard
                title=""
                data={analytics.publicationStats.byCategory.slice(0, 5)}
                dataKey="count"
                xKey="categoryName"
                xAngle={-45}
                height={220}
                color="#4ECDC4"
                layout="vertical"
              />
            </div>
            
            {/* Featured and Leaderboard */}
            <div className="pt-6 border-t-2 border-gray-100">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 bg-amber-50 rounded-lg p-3 flex-1">
                  <Award className="h-6 w-6 text-au-gold" />
                  <div>
                    <span className="text-xs text-gray-600 block">{t('admin.featured')}</span>
                    <span className="text-2xl font-bold text-au-grey-text">{analytics.publicationStats.featured}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-3 flex-1">
                  <Crown className="h-6 w-6 text-purple-500" />
                  <div>
                    <span className="text-xs text-gray-600 block">{t('admin.leaderboard')}</span>
                    <span className="text-2xl font-bold text-au-grey-text">{analytics.publicationStats.leaderboard}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* User Activity */}
        <ChartCard title={t('admin.userActivity')}>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.activeUsers')}</span>
                </div>
                <span className="text-3xl font-bold text-blue-600">{analytics.userActivity.totalActiveUsers}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.newUsersThisMonth')}</span>
                </div>
                <span className="text-3xl font-bold text-green-600">{analytics.userActivity.newUsersThisMonth}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{t('admin.newUsersThisYear')}</span>
                </div>
                <span className="text-3xl font-bold text-purple-600">{analytics.userActivity.newUsersThisYear}</span>
              </div>
            </div>

            {/* User Activity Pie Chart */}
            <div className="pt-6 border-t-2 border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{t('admin.userActivityBreakdown')}</h3>
              <PieChartCard
                title=""
                data={[
                  { name: t('admin.activeUsers'), count: analytics.userActivity.totalActiveUsers },
                  { name: t('admin.newUsersThisMonth'), count: analytics.userActivity.newUsersThisMonth },
                  { name: t('admin.newUsersThisYear'), count: analytics.userActivity.newUsersThisYear }
                ]}
                dataKey="count"
                nameKey="name"
                colors={['#3B82F6', '#10B981', '#8B5CF6']}
                height={220}
              />
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Publication Status Counts */}
      <ChartCard 
        title={t('admin.publicationStatusCounts') || 'Publication Status Counts'}
        subtitle={t('admin.publicationStatusCountsSubtitle') || 'Count of publications by status'}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : analytics?.publicationStats?.byStatus ? (
          <BarChartCard
            title=""
            data={analytics.publicationStats.byStatus.map(item => ({ 
              name: t(`publications.statusLabels.${item.status}`) || item.status, 
              count: item.count 
            }))}
            dataKey="count"
            xKey="name"
            height={320}
            color="#4ECDC4"
            layout="vertical"
            xAngle={0}
          />
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500 text-sm">No data available</p>
          </div>
        )}
      </ChartCard>

      {/* Monthly Visitor Stats */}
      <ChartCard 
        title={t('admin.monthlyVisitorStats')}
        subtitle="Track visitor engagement over the past 12 months"
      >
        <AreaChartCard
          title=""
          data={analytics.monthlyVisitorStats}
          areas={[
            { dataKey: 'views', name: 'Views', color: '#8884d8' },
            { dataKey: 'uniqueHits', name: 'Unique Hits', color: '#82ca9d' }
          ]}
          height={320}
          xKey="month"
        />
      </ChartCard>

      {/* Top Posts and Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <ChartCard title={t('admin.topPosts')}>
          <DataTable
            columns={[
              {
                key: 'rank',
                label: '#',
                className: 'w-12',
                render: (value, row, index) => (
                  <span className="font-bold text-au-grey-text">{(index || 0) + 1}</span>
                )
              },
              {
                key: 'title',
                label: t('publications.title'),
                render: (value, row) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 truncate max-w-[250px]">{value}</span>
                    <span className="text-xs text-gray-500">{row.categoryName}</span>
                  </div>
                )
              },
              {
                key: 'views',
                label: t('admin.views'),
                className: 'text-center',
                render: (value) => (
                  <span className="font-semibold">{formatNumber(value)}</span>
                )
              }
            ]}
            data={analytics.topPosts}
            emptyMessage={t('admin.noData')}
          />
        </ChartCard>

        {/* Top Categories */}
        <ChartCard title={t('admin.topCategories')}>
          <BarChartCard
            title=""
            data={analytics.topCategories}
            dataKey="totalViews"
            xKey="categoryName"
            height={380}
            color="#8884d8"
            layout="vertical"
            xAngle={-45}
          />
        </ChartCard>
      </div>

      {/* Recent Comments */}
      <ChartCard title={t('admin.recentComments') || 'Recent Comments'}>
        {commentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-3 border-au-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('admin.noComments') || 'No comments yet'}
          </div>
        ) : (
          <div className="space-y-4">
            {recentComments.map((comment) => {
              const date = new Date(comment.createdAt);
              const timeAgo = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {comment.authorName || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {comment.content}
                      </p>
                      {comment.post && (
                        <Link 
                          href={comment.post.slug ? `/publication/${comment.post.slug}` : `/admin/publications`}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          {comment.post.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

export default DashboardContent;
