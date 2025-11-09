import { Request, Response } from 'express';
import { ISettingsService } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class SettingsController {
  private logger = getLogger('SettingsController');
  private errorHandler = getErrorHandler();

  constructor(private settingsService: ISettingsService) {}

  /**
   * Public endpoint - get public site settings (SEO, contact, social links, etc.)
   */
  async getPublicSettings(req: Request, res: Response): Promise<void> {
    try {
      const allSettings = await this.settingsService.getSettings();
      
      // Filter to only return public settings
      const publicSettings: Record<string, any> = {};
      const publicKeys = [
        'site',
        'seo',
        'contact',
        'social',
        'logo',
        'favicon',
        'showLiveEventsOnHome',
      ];

      for (const key of publicKeys) {
        if (allSettings[key]) {
          publicSettings[key] = allSettings[key];
        }
      }

      publicSettings.showLiveEventsOnHome = Boolean(
        publicSettings.showLiveEventsOnHome ?? false
      );

      res.json({
        success: true,
        data: { settings: publicSettings }
      });
    } catch (error) {
      this.logger.error('Get public settings failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Admin endpoint - get all settings
   */
  async getAllSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      res.json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      this.logger.error('Get all settings failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Admin endpoint - get a specific setting by key
   */
  async getSetting(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const value = await this.settingsService.getSetting(key);

      if (value === null) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: `Setting with key "${key}" not found`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { key, value }
      });
    } catch (error) {
      this.logger.error('Get setting failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Admin endpoint - update settings (bulk update)
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Settings object is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await this.settingsService.updateSettings(settings);

      res.json({
        success: true,
        data: { message: 'Settings updated successfully' }
      });
    } catch (error) {
      this.logger.error('Update settings failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Admin endpoint - update a specific setting by key
   */
  async updateSetting(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { value, description } = req.body;

      if (value === undefined) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Value is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await this.settingsService.updateSetting(key, value, description);

      res.json({
        success: true,
        data: { message: 'Setting updated successfully', key, value }
      });
    } catch (error) {
      this.logger.error('Update setting failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}

