import { Request, Response } from 'express';
import { YouTubeService } from '../services/YouTubeService';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class YouTubeController {
  private logger = getLogger('YouTubeController');
  private errorHandler = getErrorHandler();

  constructor(private youtubeService: YouTubeService) {}

  async getLiveEvents(req: Request, res: Response): Promise<void> {
    try {
      const liveEvents = await this.youtubeService.getLiveEvents();
      res.json({
        success: true,
        data: { events: liveEvents }
      });
    } catch (error) {
      this.logger.error('Get live events failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async refreshCache(req: Request, res: Response): Promise<void> {
    try {
      await this.youtubeService.refreshCache();
      res.json({
        success: true,
        message: 'YouTube cache refreshed successfully'
      });
    } catch (error) {
      this.logger.error('Refresh YouTube cache failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}
