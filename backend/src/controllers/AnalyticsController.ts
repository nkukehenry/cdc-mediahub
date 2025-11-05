import { Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class AnalyticsController {
  private logger = getLogger('AnalyticsController');
  private errorHandler = getErrorHandler();

  constructor(private analyticsService: AnalyticsService) {}

  async getDashboardAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.analyticsService.getDashboardAnalytics();
      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      this.logger.error('Get dashboard analytics failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}

