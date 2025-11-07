import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export interface DashboardAnalytics {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalCategories: number;
    totalSubcategories: number;
    totalViews: number;
    totalUniqueHits: number;
  };
  publicationStats: {
    byStatus: Array<{ status: string; count: number }>;
    byCategory: Array<{ categoryName: string; count: number }>;
    featured: number;
    leaderboard: number;
  };
  monthlyVisitorStats: Array<{
    month: string;
    views: number;
    uniqueHits: number;
  }>;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    uniqueHits: number;
    categoryName: string;
  }>;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    publicationCount: number;
    totalViews: number;
  }>;
  userActivity: {
    totalActiveUsers: number;
    newUsersThisMonth: number;
    newUsersThisYear: number;
  };
}

export class AnalyticsService {
  private logger = getLogger('AnalyticsService');
  private errorHandler = getErrorHandler();

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    try {
      const overview = await this.getOverviewStats();
      const publicationStats = await this.getPublicationStats();
      const monthlyVisitorStats = await this.getMonthlyVisitorStats();
      const topPosts = await this.getTopPosts();
      const topCategories = await this.getTopCategories();
      const userActivity = await this.getUserActivity();

      return {
        overview,
        publicationStats,
        monthlyVisitorStats,
        topPosts,
        topCategories,
        userActivity
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard analytics', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to fetch analytics data');
    }
  }

  private async getOverviewStats(): Promise<DashboardAnalytics['overview']> {
    const [usersCount, postsCount, categoriesCount, subcategoriesCount, viewsSum, uniqueHitsSum] = await Promise.all([
      this.getCount('SELECT COUNT(*) as count FROM users'),
      this.getCount('SELECT COUNT(*) as count FROM posts'),
      this.getCount('SELECT COUNT(*) as count FROM categories'),
      this.getCount('SELECT COUNT(*) as count FROM subcategories'),
      this.getSum('SELECT SUM(views) as total FROM posts'),
      this.getSum('SELECT SUM(unique_hits) as total FROM posts')
    ]);

    return {
      totalUsers: usersCount,
      totalPosts: postsCount,
      totalCategories: categoriesCount,
      totalSubcategories: subcategoriesCount,
      totalViews: viewsSum,
      totalUniqueHits: uniqueHitsSum
    };
  }

  private async getPublicationStats(): Promise<DashboardAnalytics['publicationStats']> {
    const byStatus = await DatabaseUtils.findMany<any>(
      `SELECT status, COUNT(*) as count FROM posts GROUP BY status ORDER BY count DESC`
    );

    const byCategory = await DatabaseUtils.findMany<any>(
      `SELECT c.name as categoryName, COUNT(p.id) as count 
       FROM posts p 
       JOIN categories c ON p.category_id = c.id 
       GROUP BY c.id, c.name 
       ORDER BY count DESC`
    );

    const [featured, leaderboard] = await Promise.all([
      this.getCount('SELECT COUNT(*) as count FROM posts WHERE is_featured = 1'),
      this.getCount('SELECT COUNT(*) as count FROM posts WHERE is_leaderboard = 1')
    ]);

    return {
      byStatus: byStatus.map((row: any) => ({
        status: row.status,
        count: row.count
      })),
      byCategory: byCategory.map((row: any) => ({
        categoryName: row.categoryName,
        count: row.count
      })),
      featured,
      leaderboard
    };
  }

  private async getMonthlyVisitorStats(): Promise<DashboardAnalytics['monthlyVisitorStats']> {
    const stats = await DatabaseUtils.findMany<any>(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        SUM(views) as views,
        SUM(unique_hits) as uniqueHits
       FROM posts
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`
    );

    return stats.map((row: any) => ({
      month: row.month,
      views: row.views || 0,
      uniqueHits: row.uniqueHits || 0
    }));
  }

  private async getTopPosts(): Promise<DashboardAnalytics['topPosts']> {
    const posts = await DatabaseUtils.findMany<any>(
      `SELECT p.id, p.title, p.views, p.unique_hits, c.name as categoryName
       FROM posts p
       JOIN categories c ON p.category_id = c.id
       ORDER BY p.views DESC, p.unique_hits DESC
       LIMIT 10`
    );

    return posts.map((row: any) => ({
      id: row.id,
      title: row.title,
      views: row.views || 0,
      uniqueHits: row.unique_hits || 0,
      categoryName: row.categoryName
    }));
  }

  private async getTopCategories(): Promise<DashboardAnalytics['topCategories']> {
    const categories = await DatabaseUtils.findMany<any>(
      `SELECT 
        c.id as categoryId,
        c.name as categoryName,
        COUNT(p.id) as publicationCount,
        SUM(COALESCE(p.views, 0)) as totalViews
       FROM categories c
       LEFT JOIN posts p ON c.id = p.category_id
       GROUP BY c.id, c.name
       ORDER BY totalViews DESC, publicationCount DESC
       LIMIT 10`
    );

    return categories.map((row: any) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      publicationCount: row.publicationCount || 0,
      totalViews: row.totalViews || 0
    }));
  }

  private async getUserActivity(): Promise<DashboardAnalytics['userActivity']> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const [totalActiveUsers, newUsersThisMonth, newUsersThisYear] = await Promise.all([
      this.getCount('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
      this.getCount(`SELECT COUNT(*) as count FROM users WHERE created_at >= '${firstDayOfMonth}'`),
      this.getCount(`SELECT COUNT(*) as count FROM users WHERE created_at >= '${firstDayOfYear}'`)
    ]);

    return {
      totalActiveUsers,
      newUsersThisMonth,
      newUsersThisYear
    };
  }

  private async getCount(query: string): Promise<number> {
    const result = await DatabaseUtils.findOne<any>(query);
    return result?.count || 0;
  }

  private async getSum(query: string): Promise<number> {
    const result = await DatabaseUtils.findOne<any>(query);
    return result?.total || 0;
  }
}

