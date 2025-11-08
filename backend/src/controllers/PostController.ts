import { Request, Response } from 'express';
import { IPublicationService, PublicationStatus, PublicationFilters } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class PostController {
  private logger = getLogger('PostController');
  private errorHandler = getErrorHandler();

  constructor(private postService: IPublicationService) {}

  // Public endpoints
  async getFeatured(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await this.postService.getFeaturedPublications(limit);
      res.json({
        success: true,
        data: { posts }
      });
    } catch (error) {
      this.logger.error('Get featured posts failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await this.postService.getLeaderboardPublications(limit);
      res.json({
        success: true,
        data: { posts }
      });
    } catch (error) {
      this.logger.error('Get leaderboard posts failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getPublished(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const subcategoryId = req.query.subcategoryId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      let tags: string[] | undefined;

      if (req.query.tags) {
        const tagsParam = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
        const tagNames = tagsParam
          .filter((tag): tag is string => typeof tag === 'string')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        if (tagNames.length > 0) {
          tags = tagNames;
        }
      }

      const result = await this.postService.getPublishedPublications(categoryId, subcategoryId, limit, offset, tags);
      
      res.json({
        success: true,
        data: {
          posts: result.publications,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
          }
        }
      });
    } catch (error) {
      this.logger.error('Get published posts failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const post = await this.postService.getPublicationBySlug(slug);

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Post not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Track view (async, don't wait)
      const userId = req.user?.userId;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      this.postService.trackView(post.id, userId, ipAddress, userAgent).catch((err: Error) => {
        this.logger.warn('Failed to track view', err);
      });

      res.json({
        success: true,
        data: { post }
      });
    } catch (error) {
      this.logger.error('Get post by slug failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Search query is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const posts = await this.postService.searchPublications(q, limit, offset);

      res.json({
        success: true,
        data: { posts }
      });
    } catch (error) {
      this.logger.error('Search posts failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Admin/Author endpoints
  async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const {
        title,
        slug,
        description,
        metaTitle,
        metaDescription,
        coverImage,
        categoryId,
        subcategoryIds,
        attachmentFileIds,
        authorIds,
        status,
        publicationDate,
        hasComments,
        isFeatured,
        isLeaderboard,
        tags
      } = req.body;

      if (!title || !slug || !categoryId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Title, slug, and categoryId are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      let tagNames: string[] | undefined;
      if (tags !== undefined) {
        if (!Array.isArray(tags)) {
          res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              field: 'tags',
              message: 'Tags must be an array of strings',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        tagNames = tags
          .filter((tag: unknown): tag is string => typeof tag === 'string')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }

      const post = await this.postService.createPublication({
        title,
        slug,
        description,
        metaTitle,
        metaDescription,
        coverImage,
        categoryId,
        creatorId: req.user.userId,
        subcategoryIds,
        attachmentFileIds,
        authorIds,
        status,
        publicationDate,
        hasComments,
        isLeaderboard,
        isFeatured,
        tags: tagNames
      });

      res.status(201).json({
        success: true,
        data: { post }
      });
    } catch (error) {
      this.logger.error('Create post failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;
      const {
        tags,
        ...rest
      } = req.body as any;

      let tagNames: string[] | undefined;
      if (tags !== undefined) {
        if (!Array.isArray(tags)) {
          res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              field: 'tags',
              message: 'Tags must be an array of strings',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        tagNames = tags
          .filter((tag: unknown): tag is string => typeof tag === 'string')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }

      const updateData = {
        ...rest,
        ...(tags !== undefined ? { tags: tagNames ?? [] } : {})
      };

      const post = await this.postService.updatePublication(id, updateData, {
        userId: req.user.userId,
        roles: req.user.roles,
        permissions: req.user.permissions
      });

      res.json({
        success: true,
        data: { post }
      });
    } catch (error) {
      this.logger.error('Update post failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;
      const deleted = await this.postService.deletePublication(id, req.user.userId);

      res.json({
        success: true,
        data: { deleted }
      });
    } catch (error) {
      this.logger.error('Delete post failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;
      const post = await this.postService.approvePublication(id, req.user.userId);

      res.json({
        success: true,
        data: { post }
      });
    } catch (error) {
      this.logger.error('Approve post failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;
      const post = await this.postService.rejectPublication(id, req.user.userId);

      res.json({
        success: true,
        data: { post }
      });
    } catch (error) {
      this.logger.error('Reject post failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const post = await this.postService.getPublication(id);

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Post not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { post }
      });
    } catch (error) {
      this.logger.error('Get post by id failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Parse pagination parameters
      const page = req.query.page ? Math.max(1, parseInt(req.query.page as string)) : 1;
      const limit = req.query.limit ? Math.max(1, Math.min(100, parseInt(req.query.limit as string))) : 20;
      const offset = (page - 1) * limit;

      // Parse filter parameters
      const filters: PublicationFilters = {};
      
      if (req.query.status) {
        filters.status = req.query.status as PublicationStatus;
      }
      
      if (req.query.categoryId) {
        filters.categoryId = req.query.categoryId as string;
      }
      
      if (req.query.subcategoryId) {
        filters.subcategoryId = req.query.subcategoryId as string;
      }
      
      if (req.query.authorId) {
        filters.authorId = req.query.authorId as string;
      }
      
      if (req.query.dateFrom) {
        filters.dateFrom = req.query.dateFrom as string;
      }
      
      if (req.query.dateTo) {
        filters.dateTo = req.query.dateTo as string;
      }
      
      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      if (req.query.tags) {
        const tagsParam = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
        const tagNames = tagsParam
          .filter((tag): tag is string => typeof tag === 'string')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        if (tagNames.length > 0) {
          filters.tags = tagNames;
        }
      }

      // Check if user has permission to view all publications
      const userRoles = req.user.roles || [];
      const userPermissions = req.user.permissions || [];
      const canViewAll = userRoles.includes('admin') || userPermissions.includes('view-all-posts');
      
      const userId = canViewAll ? undefined : req.user.userId;
      
      // If user doesn't have view-all permission and creatorId is not in filters, restrict to their own
      if (!canViewAll && !filters.creatorId) {
        filters.creatorId = req.user.userId;
      }
      
      const result = await this.postService.getPublications(filters, userId, limit, offset);

      res.json({
        success: true,
        data: {
          publications: result.publications,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
          }
        }
      });
    } catch (error) {
      this.logger.error('Get all publications failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}


