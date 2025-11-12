import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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
      let limit: number | undefined;
      if (req.query.limit !== undefined) {
        const parsed = parseInt(req.query.limit as string, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          limit = parsed;
        }
      }
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
      let limit: number | undefined;
      if (req.query.limit !== undefined) {
        const parsed = parseInt(req.query.limit as string, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          limit = parsed;
        }
      }
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
      let limit: number | undefined;
      if (req.query.limit !== undefined) {
        const parsedLimit = parseInt(req.query.limit as string, 10);
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          limit = parsedLimit;
        }
      }
      let offset: number | undefined;
      if (req.query.offset !== undefined) {
        const parsedOffset = parseInt(req.query.offset as string, 10);
        if (Number.isFinite(parsedOffset) && parsedOffset >= 0) {
          offset = parsedOffset;
        }
      }
      let tags: string[] | undefined;
      const searchQuery = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

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

      const result = await this.postService.getPublishedPublications(categoryId, subcategoryId, limit, offset, tags, searchQuery?.length ? searchQuery : undefined);
      
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
      const post = await this.postService.getPublicationBySlug(slug, req.user?.userId);

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
      const viewerCookieName = 'mhub_viewer';
      let viewerToken: string | undefined = undefined;

      const existingViewerCookie = (req as any).cookies ? (req as any).cookies[viewerCookieName] : undefined;
      this.logger.debug('Incoming viewer cookie', { viewerCookieName, existingViewerCookie });
      if (typeof existingViewerCookie === 'string' && existingViewerCookie.trim().length > 0) {
        viewerToken = existingViewerCookie;
      } else {
        viewerToken = uuidv4();
        const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
        const cookieOptions = {
          maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
          httpOnly: true,
          sameSite: 'lax',
          secure: isSecure,
        } as const;
        res.cookie(viewerCookieName, viewerToken, cookieOptions);
        this.logger.debug('Viewer cookie set', { viewerToken, cookieOptions });
      }

      this.postService.trackView(post.id, userId, viewerToken, ipAddress, userAgent).catch((err: Error) => {
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

  async like(req: Request, res: Response): Promise<void> {
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
      const result = await this.postService.likePublication(id, req.user.userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.logger.error('Like post failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async unlike(req: Request, res: Response): Promise<void> {
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
      const result = await this.postService.unlikePublication(id, req.user.userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.logger.error('Unlike post failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getComments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      let limit: number | undefined;
      if (req.query.limit !== undefined) {
        const parsed = parseInt(req.query.limit as string, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          limit = parsed;
        }
      }

      let offset: number | undefined;
      if (req.query.offset !== undefined) {
        const parsed = parseInt(req.query.offset as string, 10);
        if (Number.isFinite(parsed) && parsed >= 0) {
          offset = parsed;
        }
      }

      const result = await this.postService.getComments(id, { limit, offset });

      res.json({
        success: true,
        data: {
          comments: result.comments,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            offset: result.offset,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      this.logger.error('Get comments failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async createComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { content, authorName, authorEmail } = req.body || {};

      if (!req.user) {
        const trimmedName = typeof authorName === 'string' ? authorName.trim() : '';
        const trimmedEmail = typeof authorEmail === 'string' ? authorEmail.trim() : '';

        if (!trimmedName || !trimmedEmail) {
          throw this.errorHandler.createValidationError('Name and email are required to comment', 'author');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          throw this.errorHandler.createValidationError('Invalid email address', 'authorEmail');
        }
      }

      const result = await this.postService.addComment(id, {
        postId: id,
        userId: req.user?.userId,
        authorName,
        authorEmail,
        content,
      });

      res.status(201).json({
        success: true,
        data: {
          comment: result.comment,
          commentsCount: result.commentsCount,
        },
      });
    } catch (error) {
      if ((error as any)?.type === 'VALIDATION_ERROR') {
        res.status(400).json(this.errorHandler.formatErrorResponse(error as Error));
        return;
      }
      this.logger.error('Create comment failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async deleteComment(req: Request, res: Response): Promise<void> {
    try {
      const { id, commentId } = req.params;
      if (!commentId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Comment identifier is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.postService.deleteComment(commentId, id);

      res.json({
        success: true,
        data: {
          deleted: result.deleted,
          commentsCount: result.commentsCount,
          postId: result.postId,
        },
      });
    } catch (error) {
      if ((error as any)?.type === 'VALIDATION_ERROR') {
        res.status(400).json(this.errorHandler.formatErrorResponse(error as Error));
        return;
      }
      this.logger.error('Delete comment failed', error as Error);
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

      let limit: number | undefined;
      if (req.query.limit !== undefined) {
        const parsedLimit = parseInt(req.query.limit as string, 10);
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          limit = parsedLimit;
        }
      }
      let offset: number | undefined;
      if (req.query.offset !== undefined) {
        const parsedOffset = parseInt(req.query.offset as string, 10);
        if (Number.isFinite(parsedOffset) && parsedOffset >= 0) {
          offset = parsedOffset;
        }
      }
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
      const { rejectionReason } = req.body;
      const post = await this.postService.rejectPublication(id, req.user.userId, rejectionReason);

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
      const post = await this.postService.getPublication(id, req.user?.userId);

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


