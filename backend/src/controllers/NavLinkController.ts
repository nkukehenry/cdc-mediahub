import { Request, Response } from 'express';
import { INavLinkService } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { ValidationError, ErrorType } from '../interfaces';

export class NavLinkController {
  private logger = getLogger('NavLinkController');
  private errorHandler = getErrorHandler();

  constructor(private navLinkService: INavLinkService) {}

  // Public endpoint - get all active nav links
  async getActive(req: Request, res: Response): Promise<void> {
    try {
      const navLinks = await this.navLinkService.getActiveNavLinks();
      res.json({
        success: true,
        data: { navLinks }
      });
    } catch (error) {
      this.logger.error('Get active nav links failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Admin endpoint - get all nav links
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const navLinks = await this.navLinkService.getAllNavLinks();
      res.json({
        success: true,
        data: { navLinks }
      });
    } catch (error) {
      this.logger.error('Get all nav links failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Admin endpoint - get nav link by id
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const navLink = await this.navLinkService.getNavLink(id);

      if (!navLink) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'NavLink not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { navLink }
      });
    } catch (error) {
      this.logger.error('Get nav link by id failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Admin endpoint - create nav link
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { label, url, route, external, order, isActive } = req.body;

      if (!label) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Label is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!url && !route) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Either url or route is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const navLink = await this.navLinkService.createNavLink({
        label,
        url,
        route,
        external,
        order,
        isActive
      });

      res.status(201).json({
        success: true,
        data: { navLink }
      });
    } catch (error) {
      this.logger.error('Create nav link failed', error as Error);
      const errorResponse = this.errorHandler.formatErrorResponse(error as Error);
      
      let statusCode = 500;
      if (error instanceof ValidationError || errorResponse.error.type === ErrorType.VALIDATION_ERROR) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(errorResponse);
    }
  }

  // Admin endpoint - update nav link
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { label, url, route, external, order, isActive } = req.body;

      const navLink = await this.navLinkService.updateNavLink(id, {
        label,
        url,
        route,
        external,
        order,
        isActive
      });

      res.json({
        success: true,
        data: { navLink }
      });
    } catch (error) {
      this.logger.error('Update nav link failed', error as Error);
      const errorResponse = this.errorHandler.formatErrorResponse(error as Error);
      
      let statusCode = 500;
      if (error instanceof ValidationError || errorResponse.error.type === ErrorType.VALIDATION_ERROR) {
        statusCode = 400;
      } else if (errorResponse.error.type === 'NOT_FOUND') {
        statusCode = 404;
      }
      
      res.status(statusCode).json(errorResponse);
    }
  }

  // Admin endpoint - delete nav link
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.navLinkService.deleteNavLink(id);

      res.json({
        success: true,
        data: { deleted }
      });
    } catch (error) {
      this.logger.error('Delete nav link failed', error as Error);
      const errorResponse = this.errorHandler.formatErrorResponse(error as Error);
      
      let statusCode = 500;
      if (error instanceof ValidationError || errorResponse.error.type === ErrorType.VALIDATION_ERROR) {
        statusCode = 400;
      } else if (errorResponse.error.type === 'NOT_FOUND') {
        statusCode = 404;
      }
      
      res.status(statusCode).json(errorResponse);
    }
  }
}

