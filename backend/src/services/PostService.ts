import { IPublicationService, IPublicationRepository, ICategoryRepository, IUserRepository, IFileRepository, PublicationWithRelations, CreatePublicationData, UpdatePublicationData, PublicationEntity, PublicationStatus, PublicationFilters, ITagRepository, TagEntity, IPostLikeRepository, IPostCommentRepository, PostCommentEntity, CreatePostCommentData } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class PostService implements IPublicationService {
  private logger = getLogger('PostService');
  private errorHandler = getErrorHandler();

  constructor(
    private postRepository: IPublicationRepository,
    private categoryRepository: ICategoryRepository,
    private userRepository: IUserRepository,
    private fileRepository: IFileRepository,
    private tagRepository: ITagRepository,
    private postLikeRepository: IPostLikeRepository,
    private postCommentRepository: IPostCommentRepository
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

      // Validate audio/video categories have matching attachments
      const categoryNameLower = category.name.toLowerCase();
      const categorySlugLower = category.slug.toLowerCase();
      const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
      const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
      
      if ((isAudioCategory || isVideoCategory) && postData.attachmentFileIds && postData.attachmentFileIds.length > 0) {
        // Check if at least one attachment matches the category type
        let hasMatchingAttachment = false;
        for (const fileId of postData.attachmentFileIds) {
          const file = await this.fileRepository.findById(fileId);
          if (file) {
            if (isAudioCategory && file.mimeType.startsWith('audio/')) {
              hasMatchingAttachment = true;
              break;
            }
            if (isVideoCategory && file.mimeType.startsWith('video/')) {
              hasMatchingAttachment = true;
              break;
            }
          }
        }
        
        if (!hasMatchingAttachment) {
          const categoryType = isAudioCategory ? 'audio' : 'video';
          throw this.errorHandler.createValidationError(
            `Publications in ${categoryType} categories must have at least one ${categoryType} attachment`,
            'attachmentFileIds'
          );
        }
      } else if (isAudioCategory || isVideoCategory) {
        // Category requires attachments but none provided
        const categoryType = isAudioCategory ? 'audio' : 'video';
        throw this.errorHandler.createValidationError(
          `Publications in ${categoryType} categories must have at least one ${categoryType} attachment`,
          'attachmentFileIds'
        );
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

      const { tags, ...createData } = postData;

      const post = await this.postRepository.create(createData);

      if (tags && tags.length > 0) {
        const tagEntities = await this.tagRepository.findOrCreate(tags);
        await this.tagRepository.assignTagsToPost(post.id, tagEntities.map(tag => tag.id));
      }

      this.logger.info('Post created successfully', { postId: post.id });
      return post;
    } catch (error) {
      this.logger.error('Failed to create post', error as Error);
      throw error;
    }
  }

  async getPublication(id: string, userId?: string): Promise<PublicationWithRelations | null> {
    try {
      const post = await this.postRepository.getWithRelations(id);
      if (!post) {
        return null;
      }
      return this.enrichPublicationWithUserState(post, userId);
    } catch (error) {
      this.logger.error('Failed to get post', error as Error, { postId: id });
      throw error;
    }
  }

  async getPublicationBySlug(slug: string, userId?: string): Promise<PublicationWithRelations | null> {
    try {
      const post = await this.postRepository.findBySlug(slug);
      if (!post) {
        return null;
      }
      const withRelations = await this.postRepository.getWithRelations(post.id);
      if (!withRelations) {
        return null;
      }
      return this.enrichPublicationWithUserState(withRelations, userId);
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

  async likePublication(id: string, userId: string): Promise<{ liked: boolean; likes: number }> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      const alreadyLiked = await this.postLikeRepository.hasUserLiked(id, userId);
      if (!alreadyLiked) {
        await this.postLikeRepository.addLike(id, userId);
      }

      const likes = await this.refreshLikeCount(id);
      return { liked: true, likes };
    } catch (error) {
      this.logger.error('Failed to like post', error as Error, { postId: id, userId });
      throw error;
    }
  }

  async unlikePublication(id: string, userId: string): Promise<{ liked: boolean; likes: number }> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      const alreadyLiked = await this.postLikeRepository.hasUserLiked(id, userId);
      if (alreadyLiked) {
        await this.postLikeRepository.removeLike(id, userId);
      }

      const likes = await this.refreshLikeCount(id);
      return { liked: false, likes };
    } catch (error) {
      this.logger.error('Failed to unlike post', error as Error, { postId: id, userId });
      throw error;
    }
  }

  async getComments(id: string, options?: { limit?: number; offset?: number }): Promise<{ comments: PostCommentEntity[]; total: number; limit: number; offset: number; page: number; totalPages: number }> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      const limit = options?.limit !== undefined ? options.limit : 20;
      const offset = options?.offset !== undefined ? options.offset : 0;
      const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
      const safeOffset = Math.max(0, Math.floor(offset));

      const comments = await this.postCommentRepository.findByPost(id, safeLimit, safeOffset);
      const total = await this.postCommentRepository.countByPost(id);

      const enrichedComments = await Promise.all(
        comments.map(async (comment) => this.enrichCommentAuthor(comment))
      );

      const page = Math.floor(safeOffset / safeLimit) + 1;
      const totalPages = Math.max(1, Math.ceil(total / safeLimit));

      return {
        comments: enrichedComments,
        total,
        limit: safeLimit,
        offset: safeOffset,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to get comments', error as Error, { postId: id, options });
      throw error;
    }
  }

  async addComment(id: string, data: CreatePostCommentData): Promise<{ comment: PostCommentEntity; commentsCount: number }> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      if (!post.hasComments) {
        throw this.errorHandler.createValidationError('Comments are disabled for this publication');
      }

      const content = data.content?.trim();
      if (!content) {
        throw this.errorHandler.createValidationError('Comment content is required', 'content');
      }

      const commentPayload: CreatePostCommentData = {
        postId: id,
        userId: data.userId,
        authorName: data.userId ? data.authorName : data.authorName?.trim(),
        authorEmail: data.userId ? undefined : data.authorEmail?.trim(),
        content,
      };

      if (commentPayload.userId) {
        const user = await this.userRepository.findById(commentPayload.userId);
        if (user) {
          commentPayload.authorName = user.firstName || user.lastName || user.username || user.email;
        }
      }

      const comment = await this.postCommentRepository.create(commentPayload);
      const enriched = await this.enrichCommentAuthor(comment);
      const commentsCount = await this.refreshCommentCount(id);
      return { comment: enriched, commentsCount };
    } catch (error) {
      this.logger.error('Failed to add comment', error as Error, { postId: id, data });
      throw error;
    }
  }

  async deleteComment(commentId: string, expectedPostId?: string): Promise<{ deleted: boolean; postId: string; commentsCount: number }> {
    try {
      const comment = await this.postCommentRepository.findById(commentId);
      if (!comment) {
        throw this.errorHandler.createValidationError('Comment not found', 'commentId');
      }

      if (expectedPostId && comment.postId !== expectedPostId) {
        throw this.errorHandler.createValidationError('Comment does not belong to the specified publication', 'commentId');
      }

      await this.postCommentRepository.delete(commentId);
      const commentsCount = await this.refreshCommentCount(comment.postId);
      return {
        deleted: true,
        postId: comment.postId,
        commentsCount,
      };
    } catch (error) {
      this.logger.error('Failed to delete comment', error as Error, { commentId });
      throw error;
    }
  }

  async getPublishedPublications(categoryId?: string, subcategoryId?: string, limit?: number, offset?: number, tags?: string[], search?: string): Promise<{ publications: PublicationWithRelations[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const finalLimit = limit || 20;
      const finalOffset = offset || 0;
      
      // Get total count for pagination
      const total = await this.postRepository.countPublished(categoryId, subcategoryId, tags, search);
      
      // Get publications with pagination
      const posts = await this.postRepository.findPublished(categoryId, subcategoryId, finalLimit, finalOffset, tags, search);
      const postsWithRelations = await Promise.all(
        posts.map((post: PublicationEntity) => this.postRepository.getWithRelations(post.id))
      );
      const publications = postsWithRelations.filter((p): p is PublicationWithRelations => p !== null);
      
      const page = Math.floor(finalOffset / finalLimit) + 1;
      const totalPages = Math.ceil(total / finalLimit);

      return {
        publications,
        total,
        page,
        limit: finalLimit,
        totalPages
      };
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

  async updatePublication(
    id: string,
    data: UpdatePublicationData,
    userContext?: {
      userId?: string;
      roles?: string[];
      permissions?: string[];
    }
  ): Promise<PublicationEntity> {
    try {
      const existingPost = await this.postRepository.findById(id);
      if (!existingPost) {
        throw this.errorHandler.createValidationError('Post not found', 'id');
      }

      // Check if user has permission to update (must be creator or admin)
      if (userContext?.userId && existingPost.creatorId !== userContext.userId) {
        const hasOverridePermission = Boolean(
          userContext.permissions?.includes('posts:approve') ||
          userContext.roles?.includes('admin')
        );

        if (hasOverridePermission) {
          this.logger.debug('Update override due to permission', {
            postId: id,
            userId: userContext.userId,
            permissions: userContext.permissions
          });
        } else {
        throw this.errorHandler.createValidationError('You do not have permission to update this post');
        }
      }

      // Validate category if being updated
      let category = null;
      if (data.categoryId) {
        category = await this.categoryRepository.findById(data.categoryId);
        if (!category) {
          throw this.errorHandler.createValidationError('Category not found', 'categoryId');
        }
      } else {
        // Use existing category if not being updated
        category = await this.categoryRepository.findById(existingPost.categoryId);
      }

      // Validate audio/video categories have matching attachments
      if (category) {
        const categoryNameLower = category.name.toLowerCase();
        const categorySlugLower = category.slug.toLowerCase();
        const isAudioCategory = categoryNameLower.includes('audio') || categorySlugLower.includes('audio');
        const isVideoCategory = categoryNameLower.includes('video') || categorySlugLower.includes('video');
        
        if (isAudioCategory || isVideoCategory) {
          // Get attachment file IDs - use updated ones if provided, otherwise get existing
          let attachmentFileIds: string[] = [];
          if (data.attachmentFileIds !== undefined) {
            attachmentFileIds = data.attachmentFileIds;
          } else {
            const existingPostWithRelations = await this.postRepository.getWithRelations(id);
            attachmentFileIds = existingPostWithRelations?.attachments?.map(a => a.id) || [];
          }
          
          if (attachmentFileIds.length > 0) {
            // Check if at least one attachment matches the category type
            let hasMatchingAttachment = false;
            for (const fileId of attachmentFileIds) {
              const file = await this.fileRepository.findById(fileId);
              if (file) {
                if (isAudioCategory && file.mimeType.startsWith('audio/')) {
                  hasMatchingAttachment = true;
                  break;
                }
                if (isVideoCategory && file.mimeType.startsWith('video/')) {
                  hasMatchingAttachment = true;
                  break;
                }
              }
            }
            
            if (!hasMatchingAttachment) {
              const categoryType = isAudioCategory ? 'audio' : 'video';
              throw this.errorHandler.createValidationError(
                `Publications in ${categoryType} categories must have at least one ${categoryType} attachment`,
                'attachmentFileIds'
              );
            }
          } else {
            // Category requires attachments but none provided
            const categoryType = isAudioCategory ? 'audio' : 'video';
            throw this.errorHandler.createValidationError(
              `Publications in ${categoryType} categories must have at least one ${categoryType} attachment`,
              'attachmentFileIds'
            );
          }
        }
      }

      // Validate attachment files if being updated
      if (data.attachmentFileIds !== undefined && data.attachmentFileIds.length > 0) {
        for (const fileId of data.attachmentFileIds) {
          const file = await this.fileRepository.findById(fileId);
          if (!file) {
            throw this.errorHandler.createFileNotFoundError(fileId);
          }
          // Optionally check ownership - for now, allow any file
        }
        this.logger.debug('Validated attachment files', { fileIds: data.attachmentFileIds });
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

      const { tags, ...updateData } = data;

      const updatedPost = await this.postRepository.update(id, updateData);

      if (tags !== undefined) {
        const normalizedTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
        if (normalizedTags.length > 0) {
          const tagEntities = await this.tagRepository.findOrCreate(normalizedTags);
          await this.tagRepository.assignTagsToPost(id, tagEntities.map(tag => tag.id));
        } else {
          await this.tagRepository.assignTagsToPost(id, []);
        }
      }

      this.logger.debug('Updating publication', { postId: id, updateData: { ...data, attachmentFileIds: data.attachmentFileIds?.length || 0 } });
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

  async trackView(id: string, userId?: string, viewerToken?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        return; // Silently fail for tracking
      }

      // Record view in post_views table and determine if this visitor is unique
      const recorded = await this.postRepository.recordView(id, userId, viewerToken, ipAddress, userAgent);
      if (!recorded) {
        this.logger.debug('Post view already counted', { postId: id, userId, viewerToken, ipAddress });
        return;
      }

      await this.postRepository.incrementViews(id);
      
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

  private async enrichPublicationWithUserState(post: PublicationWithRelations, userId?: string): Promise<PublicationWithRelations> {
    if (!post) {
      return post;
    }

    if (!userId) {
      return { ...post, isLiked: false };
    }

    try {
      const liked = await this.postLikeRepository.hasUserLiked(post.id, userId);
      return { ...post, isLiked: liked };
    } catch (error) {
      const context = userId ? { postId: post.id, userId } : { postId: post.id };
      const meta = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      };
      this.logger.warn('Failed to resolve like status', meta);
      return { ...post, isLiked: false };
    }
  }

  private async refreshLikeCount(postId: string): Promise<number> {
    const likes = await this.postLikeRepository.countByPost(postId);
    await this.postRepository.updateCounts(postId, { likesCount: likes });
    return likes;
  }

  private async refreshCommentCount(postId: string): Promise<number> {
    const total = await this.postCommentRepository.countByPost(postId);
    await this.postRepository.updateCounts(postId, { commentsCount: total });
    return total;
  }

  private async enrichCommentAuthor(comment: PostCommentEntity): Promise<PostCommentEntity> {
    const enriched: PostCommentEntity = { ...comment };

    if (enriched.userId) {
      if (!enriched.author) {
        const user = await this.userRepository.findById(enriched.userId);
        if (user) {
          enriched.author = {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          };
          if (!enriched.authorName) {
            enriched.authorName = user.firstName || user.username || user.email;
          }
        }
      } else if (!enriched.authorName) {
        const author = enriched.author;
        enriched.authorName = author.firstName || author.username || author.id;
      }
    }

    if (!enriched.authorName) {
      enriched.authorName = 'Anonymous';
    }

    return enriched;
  }
}

