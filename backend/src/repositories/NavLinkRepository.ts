import { INavLinkRepository, NavLinkEntity, CreateNavLinkData, UpdateNavLinkData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class NavLinkRepository implements INavLinkRepository {
  private logger = getLogger('NavLinkRepository');
  private errorHandler = getErrorHandler();

  async create(navLinkData: CreateNavLinkData): Promise<NavLinkEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const navLink: NavLinkEntity = {
        id,
        label: navLinkData.label,
        url: navLinkData.url,
        route: navLinkData.route,
        external: navLinkData.external !== undefined ? navLinkData.external : false,
        order: navLinkData.order !== undefined ? navLinkData.order : 0,
        isActive: navLinkData.isActive !== undefined ? navLinkData.isActive : true,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: navLink.id,
        label: navLink.label,
        url: navLink.url,
        route: navLink.route,
        external: navLink.external ? 1 : 0,
        display_order: navLink.order,
        is_active: navLink.isActive ? 1 : 0,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO nav_links (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('NavLink created', { navLinkId: id });
      return navLink;
    } catch (error) {
      this.logger.error('Failed to create navLink', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create navLink', 'create', 'nav_links');
    }
  }

  async findById(id: string): Promise<NavLinkEntity | null> {
    try {
      const navLink = await DatabaseUtils.findOne<any>(
        'SELECT * FROM nav_links WHERE id = ?',
        [id]
      );

      if (!navLink) {
        return null;
      }

      return this.mapToNavLinkEntity(navLink);
    } catch (error) {
      this.logger.error('Failed to find navLink by id', error as Error, { navLinkId: id });
      throw this.errorHandler.createDatabaseError('Failed to find navLink by id', 'select', 'nav_links');
    }
  }

  async findAll(): Promise<NavLinkEntity[]> {
    try {
      const navLinks = await DatabaseUtils.findMany<any>(
        'SELECT * FROM nav_links ORDER BY display_order ASC, label ASC'
      );
      return navLinks.map(navLink => this.mapToNavLinkEntity(navLink));
    } catch (error) {
      this.logger.error('Failed to find all navLinks', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all navLinks', 'select', 'nav_links');
    }
  }

  async findActive(): Promise<NavLinkEntity[]> {
    try {
      const navLinks = await DatabaseUtils.findMany<any>(
        'SELECT * FROM nav_links WHERE is_active = 1 ORDER BY display_order ASC, label ASC'
      );
      return navLinks.map(navLink => this.mapToNavLinkEntity(navLink));
    } catch (error) {
      this.logger.error('Failed to find active navLinks', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find active navLinks', 'select', 'nav_links');
    }
  }

  async update(id: string, data: UpdateNavLinkData): Promise<NavLinkEntity> {
    try {
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const updateFields: any = {
        updated_at: now
      };

      if (data.label !== undefined) updateFields.label = data.label;
      if (data.url !== undefined) updateFields.url = data.url;
      if (data.route !== undefined) updateFields.route = data.route;
      if (data.external !== undefined) updateFields.external = data.external ? 1 : 0;
      if (data.order !== undefined) updateFields.display_order = data.order;
      if (data.isActive !== undefined) updateFields.is_active = data.isActive ? 1 : 0;

      const { set, values } = DatabaseUtils.buildUpdateSet(updateFields);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE nav_links SET ${set} WHERE id = ?`,
        params
      );

      const updatedNavLink = await this.findById(id);
      if (!updatedNavLink) {
        throw this.errorHandler.createDatabaseError('NavLink not found after update', 'select', 'nav_links');
      }

      this.logger.debug('NavLink updated', { navLinkId: id });
      return updatedNavLink;
    } catch (error) {
      this.logger.error('Failed to update navLink', error as Error, { navLinkId: id });
      throw this.errorHandler.createDatabaseError('Failed to update navLink', 'update', 'nav_links');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM nav_links WHERE id = ?',
        [id]
      );

      const deleted = result.changes > 0;
      if (deleted) {
        this.logger.debug('NavLink deleted', { navLinkId: id });
      }
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete navLink', error as Error, { navLinkId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete navLink', 'delete', 'nav_links');
    }
  }

  private mapToNavLinkEntity(dbNavLink: any): NavLinkEntity {
    return {
      id: dbNavLink.id,
      label: dbNavLink.label,
      url: dbNavLink.url,
      route: dbNavLink.route,
      external: dbNavLink.external === 1 || dbNavLink.external === true,
      order: dbNavLink.display_order || 0,
      isActive: dbNavLink.is_active === 1 || dbNavLink.is_active === true,
      createdAt: new Date(dbNavLink.created_at),
      updatedAt: new Date(dbNavLink.updated_at)
    };
  }
}

