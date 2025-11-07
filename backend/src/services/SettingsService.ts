import { ISettingsService, ISettingsRepository, ErrorType } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class SettingsService implements ISettingsService {
  private logger = getLogger('SettingsService');
  private errorHandler = getErrorHandler();

  constructor(private settingsRepository: ISettingsRepository) {}

  async getSettings(): Promise<Record<string, any>> {
    try {
      const settings = await this.settingsRepository.findAll();
      const result: Record<string, any> = {};

      for (const setting of settings) {
        try {
          result[setting.key] = JSON.parse(setting.value);
        } catch (error) {
          // If value is not valid JSON, store as string
          this.logger.warn(`Setting "${setting.key}" has invalid JSON, storing as string`, error as Error);
          result[setting.key] = setting.value;
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get settings', error as Error);
      throw this.errorHandler.createError(ErrorType.INTERNAL_ERROR, 'Failed to get settings');
    }
  }

  async getSetting(key: string): Promise<any> {
    try {
      const setting = await this.settingsRepository.findByKey(key);
      if (!setting) {
        return null;
      }

      try {
        return JSON.parse(setting.value);
      } catch (error) {
        // If value is not valid JSON, return as string
        this.logger.warn(`Setting "${key}" has invalid JSON, returning as string`, error as Error);
        return setting.value;
      }
    } catch (error) {
      this.logger.error('Failed to get setting', error as Error);
      throw this.errorHandler.createError(ErrorType.INTERNAL_ERROR, 'Failed to get setting');
    }
  }

  async updateSettings(settings: Record<string, any>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await this.updateSetting(key, value);
      }
      this.logger.info('Settings updated', { keys: Object.keys(settings) });
    } catch (error) {
      this.logger.error('Failed to update settings', error as Error);
      throw this.errorHandler.createError(ErrorType.INTERNAL_ERROR, 'Failed to update settings');
    }
  }

  async updateSetting(key: string, value: any, description?: string): Promise<void> {
    try {
      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      await this.settingsRepository.upsert(key, valueString, description);
      this.logger.debug('Setting updated', { key });
    } catch (error) {
      this.logger.error('Failed to update setting', error as Error);
      throw this.errorHandler.createError(ErrorType.INTERNAL_ERROR, 'Failed to update setting');
    }
  }
}

