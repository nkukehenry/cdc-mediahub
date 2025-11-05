import { IPublicationService, IPublicationRepository, ICategoryRepository, IUserRepository, IFileRepository, PublicationWithRelations, CreatePublicationData, UpdatePublicationData, PublicationEntity, PublicationStatus, PublicationFilters } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class PostService implements IPublicationService {
  private logger = getLogger('PostService');
  private errorHandler = getErrorHandler();

  constructor(
    private postRepository: IPublicationRepository,
    private categoryRepository: ICategoryRepository,
    private userRepository: IUserRepository,
    private fileRepository: IFileRepository
  ) {}

  async createPublication(postData: CreatePublicationData): Promise<PublicationEntity> {
    try {
      // Validate category exists
      const category = await this.categoryRepository.findById(postData.categoryId);
      if (!category) {
        this.logger.error('Category not found', new Error('Category not found'), { categoryId: postData.categoryId });
        throw this.errorHandler.createValidationError('Category not found', 'categoryId');
      }

      // Validate creator exists
      const creator = await this.userRepository.findById(postData.creatorId);
      if (!creator) {
        this.logger.error('Creator not found', new Error('Creator not found'), { creatorId: postData.creatorId });
        throw this.errorHandler.createValidationError('Creator not found', 'creatorId');
      }

      // Validate attachment files exist and belong to creator
      if (postData.attachmentFileIds && postData.attachmentFileIds.length > 0) {
        for (const fileId of postData.attachmentFileIds) {
          const file = await this.fileRepository.findById(fileId);
          if (!file) {
            throw this.errorHandler.createFileNotFoundError(fileId);
          }
          // Optionally check ownership - for now, allow any file
        }
      }

      // Validate authors exist
      if (postData.authorIds && postData.authorIds.length > 0) {
        for (const authorId of postData.authorIds) {
          const author = await this.userRepository.findById(authorId);
          if (!author) {
            throw this.errorHandler.createValidationError(`Author with ID ${authorId} not found`, 'authorIds');
          }
        }
      }

      const post = await this.postRepository.create(postData);
      this.logger.info('Post created successfully', { postId: post.id });
      return post;
    } catch (error) {
      this.logger.error('Failed to create post', error as Error);
      throw error;
    }
  }

  async getPublication(id: string): Promise<PublicationWithRelations | null> {
    try {
      const post = await this.postRepository.getWithRelations(id);
      return post;
    } catch (error) {
      this.logger.error('Failed to get post', error as Error, { postId: id });
      throw error;
    }
  }

  async getPublicationBySlug(slug: string): Promise<PublicationWithRelations | null> {
    try {
      const post = await this.postRepository.findBySlug(slug);
      if (!post) {
        return null;
      }
      return await this.postRepository.getWithRelations(post.id);
    } catch (error) {
      this.logger.error('Failed to get post by slug', error as Error, { slug });
      throw error;
    }
  }

  async getFeaturedPublications(limit?: number): Promise<PublicationWithRelations[]> {
    try {
      const posts = await this.postRepository.findFeatured(limit);
      const postsWithRelations = await Promise.all(
        posts.map((post: PublicationEntity) => this.postRepository.getWithRelations(post.id))
      );
      return postsWithRelations.filter((p): p is PublicationWithRelations => p !== null);
    } catch (error) {
      this.logger.error('Failed to get featured posts', error as Error);
      throw error;
    }
  }

  async getLeaderboardPublications(limit?: number): Promise<PublicationWithRelations[]> {
    try {
      const posts = await this.postRepository.findLeaderboard(limit);
      const postsWithRelations = await Promise.all(
        posts.map((post: PublicationEntity) => this.postRepository.getWithRelations(post.id))
      );
      return postsWithRelations.filter((p): p is PublicationWithRelations => p !== null);
    } catch (error) {
      this.logger.error('Failed to get leaderboard posts', error as Error);
      throw error;
    }
  }

  async getPublishedPublications(limit?: number, offset?: number): Promise<PublicationWithRelations[]> {
    try {
      const posts = await this.postRepository.findPublished(limit, offset);
      const postsWithRelations = await Promise.all(
        posts.map((post: PublicationEntity) => this.postRepository.getWithRelations(post.id))
      );
      return postsWithRelations.filter((p): p is PublicationWithRelations => p !== null);
    } catch (error) {
      this.logger.error('Failed to get published posts', error as Error);
      throw error;
    }
  }

  async getPublications(filters?: PublicationFilters, userId?: string, limit: number = 20, offset: number = 0): Promise<{ publications: PublicationWithRelations[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      // Apply user filter if not admin
      const finalFilters: PublicationFilters = {
        ...filters,
        creatorId: userId || filters?.creatorId
      };

      // Remove creatorId if user can view all (userId is undefined means admin view)
      if (!userId && filters?.creatorId) {
        finalFilters.creatorId = filters.creatorId;
      } else if (userId) {
        finalFilters.creatorId = userId;
      }

      // Get total count for pagination
      const total = await this.postRepository.countAll(finalFilters);
      
      // Get publications with filters and pagination
      const posts = await this.postRepository.findAll(finalFilters, limit, offset);

      // Get full relations for each publication
      const postsWithRelations = await Promise.all(
        posts.map((post: PublicationEntity) => this.postRepository.getWithRelations(post.id))
      );
      
      const publications = postsWithRelations.filter((p): p is PublicationWithRelations => p !== null);
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      return {
        publications,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error('Failed to get publications', error as Error);
      throw error;
    }
  }

  async updatePublication(id: string, data: UpdatePublicationData, userId?: string): Promise<PublicationEntity> {
    try {
      const existingPost = await this.postRepository.findById(id);
      if (!existingPost) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      // Check if user has permission to update (must be creator or admin)
      if (userId && existingPost.creatorId !== userId) {
        // In a real system, check for admin role via RBAC
        // For now, only creator can update
        throw this.errorHandler.createValidationError('You do not have permission to update this post');
      }

      // Validate category if being updated
      if (data.categoryId) {
        const category = await this.categoryRepository.findById(data.categoryId);
        if (!category) {
          throw this.errorHandler.createValidationError('Category not found', 'categoryId');
        }
      }

      // Validate authors if being updated
      if (data.authorIds && data.authorIds.length > 0) {
        for (const authorId of data.authorIds) {
          const author = await this.userRepository.findById(authorId);
          if (!author) {
            throw this.errorHandler.createValidationError(`Author with ID ${authorId} not found`, 'authorIds');
          }
        }
      }

      const updatedPost = await this.postRepository.update(id, data);
      this.logger.info('Post updated successfully', { postId: id });
      return updatedPost;
    } catch (error) {
      this.logger.error('Failed to update post', error as Error, { postId: id });
      throw error;
    }
  }

  async deletePublication(id: string, userId?: string): Promise<boolean> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      // Check if user has permission to delete (must be creator or admin)
      if (userId && post.creatorId !== userId) {
        // In a real system, check for admin role via RBAC
        throw this.errorHandler.createValidationError('You do not have permission to delete this post');
      }

      const deleted = await this.postRepository.delete(id);
      this.logger.info('Post deleted successfully', { postId: id });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete post', error as Error, { postId: id });
      throw error;
    }
  }

  async approvePublication(id: string, approverId: string): Promise<PublicationEntity> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      // Verify approver exists
      const approver = await this.userRepository.findById(approverId);
      if (!approver) {
        throw this.errorHandler.createValidationError('Approver not found', 'approverId');
      }

      const updatedPost = await this.postRepository.update(id, {
        status: 'approved',
        approvedBy: approverId
      });

      this.logger.info('Post approved successfully', { postId: id, approverId });
      return updatedPost;
    } catch (error) {
      this.logger.error('Failed to approve post', error as Error, { postId: id });
      throw error;
    }
  }

  async rejectPublication(id: string, approverId: string): Promise<PublicationEntity> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      // Verify approver exists
      const approver = await this.userRepository.findById(approverId);
      if (!approver) {
        throw this.errorHandler.createValidationError('Approver not found', 'approverId');
      }

      const updatedPost = await this.postRepository.update(id, {
        status: 'rejected',
        approvedBy: approverId
      });

      this.logger.info('Post rejected successfully', { postId: id, approverId });
      return updatedPost;
    } catch (error) {
      this.logger.error('Failed to reject post', error as Error, { postId: id });
      throw error;
    }
  }

  async trackView(id: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        return; // Silently fail for tracking
      }

      // Record view in post_views table
      await this.postRepository.recordView(id, userId, ipAddress, userAgent);

      // Check if this is a unique view - check if user/IP already viewed
      // For simplicity, increment unique_hits if userId is provided (assume unique)
      // In production, you'd query post_views to check for duplicates
      const isUnique = !!userId;

      await this.postRepository.incrementViews(id, isUnique);
      
      this.logger.debug('Post view tracked', { postId: id, userId, ipAddress });
    } catch (error) {
      this.logger.error('Failed to track post view', error as Error, { postId: id });
      // Don't throw - tracking failures shouldn't break the request
    }
  }

  async searchPublications(query: string, limit?: number, offset?: number): Promise<PublicationWithRelations[]> {
    try {
      const posts = await this.postRepository.search(query, limit, offset);
      const postsWithRelations = await Promise.all(
        posts.map((post: PublicationEntity) => this.postRepository.getWithRelations(post.id))
      );
      return postsWithRelations.filter((p): p is PublicationWithRelations => p !== null);
    } catch (error) {
      this.logger.error('Failed to search posts', error as Error, { query });
      throw error;
    }
  }
}

