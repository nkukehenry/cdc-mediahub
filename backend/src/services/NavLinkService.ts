import { INavLinkService, INavLinkRepository, NavLinkEntity, CreateNavLinkData, UpdateNavLinkData } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class NavLinkService implements INavLinkService {
  private logger = getLogger('NavLinkService');
  private errorHandler = getErrorHandler();

  constructor(private navLinkRepository: INavLinkRepository) {}

  async createNavLink(navLinkData: CreateNavLinkData): Promise<NavLinkEntity> {
    try {
      // Validation: either url or route must be provided, not both
      if (!navLinkData.url && !navLinkData.route) {
        throw this.errorHandler.createValidationError('Either url or route must be provided', 'url');
      }
      
      if (navLinkData.url && navLinkData.route) {
        throw this.errorHandler.createValidationError('Cannot provide both url and route', 'url');
      }

      // Set external based on whether url or route is provided
      if (!navLinkData.external && navLinkData.url) {
        navLinkData.external = true;
      }

      const navLink = await this.navLinkRepository.create(navLinkData);
      
      this.logger.info('NavLink created successfully', { navLinkId: navLink.id });
      return navLink;
    } catch (error) {
      this.logger.error('Failed to create navLink', error as Error);
      throw error;
    }
  }

  async getNavLink(id: string): Promise<NavLinkEntity | null> {
    try {
      const navLink = await this.navLinkRepository.findById(id);
      return navLink;
    } catch (error) {
      this.logger.error('Failed to get navLink', error as Error, { navLinkId: id });
      throw error;
    }
  }

  async getAllNavLinks(): Promise<NavLinkEntity[]> {
    try {
      const navLinks = await this.navLinkRepository.findAll();
      return navLinks;
    } catch (error) {
      this.logger.error('Failed to get all navLinks', error as Error);
      throw error;
    }
  }

  async getActiveNavLinks(): Promise<NavLinkEntity[]> {
    try {
      const navLinks = await this.navLinkRepository.findActive();
      return navLinks;
    } catch (error) {
      this.logger.error('Failed to get active navLinks', error as Error);
      throw error;
    }
  }

  async updateNavLink(id: string, data: UpdateNavLinkData): Promise<NavLinkEntity> {
    try {
      const existing = await this.navLinkRepository.findById(id);
      if (!existing) {
        throw this.errorHandler.createValidationError('NavLink not found', 'id');
      }

      // Validation: if both url and route are being set
      if (data.url !== undefined && data.route !== undefined) {
        throw this.errorHandler.createValidationError('Cannot provide both url and route', 'url');
      }

      // Set external based on whether url or route is provided
      if (data.url !== undefined) {
        data.external = true;
      } else if (data.route !== undefined) {
        data.external = false;
      }

      const updated = await this.navLinkRepository.update(id, data);
      this.logger.info('NavLink updated successfully', { navLinkId: id });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update navLink', error as Error, { navLinkId: id });
      throw error;
    }
  }

  async deleteNavLink(id: string): Promise<boolean> {
    try {
      const navLink = await this.navLinkRepository.findById(id);
      if (!navLink) {
        throw this.errorHandler.createValidationError('NavLink not found', 'id');
      }

      const deleted = await this.navLinkRepository.delete(id);
      this.logger.info('NavLink deleted successfully', { navLinkId: id });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete navLink', error as Error, { navLinkId: id });
      throw error;
    }
  }
}

