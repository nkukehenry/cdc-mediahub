import { IPublicationRepository, PublicationEntity, PublicationWithRelations, CreatePublicationData, UpdatePublicationData, PublicationStatus, PublicationFilters } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class PostRepository implements IPublicationRepository {
  private logger = getLogger('PostRepository');
  private errorHandler = getErrorHandler();

  async create(postData: CreatePublicationData): Promise<PublicationEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const post: PublicationEntity = {
        id,
        title: postData.title,
        slug: postData.slug,
        description: postData.description,
        metaTitle: postData.metaTitle,
        metaDescription: postData.metaDescription,
        coverImage: postData.coverImage,
        categoryId: postData.categoryId,
        creatorId: postData.creatorId,
        status: postData.status || 'pending',
        publicationDate: postData.publicationDate ? new Date(postData.publicationDate) : undefined,
        hasComments: postData.hasComments ?? true,
        views: 0,
        uniqueHits: 0,
        isFeatured: postData.isFeatured ?? false,
        isLeaderboard: postData.isLeaderboard ?? false,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      // Build insert values, filtering out undefined fields
      const insertData: Record<string, any> = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        category_id: post.categoryId,
        creator_id: post.creatorId,
        status: post.status,
        has_comments: post.hasComments ? 1 : 0,
        views: post.views,
        unique_hits: post.uniqueHits,
        is_featured: post.isFeatured ? 1 : 0,
        is_leaderboard: post.isLeaderboard ? 1 : 0,
        created_at: now,
        updated_at: now
      };

      // Add optional fields only if they have values
      if (post.description !== undefined && post.description !== null && post.description.trim() !== '') {
        insertData.description = post.description;
      }
      if (post.metaTitle !== undefined && post.metaTitle !== null && post.metaTitle.trim() !== '') {
        insertData.meta_title = post.metaTitle;
      }
      if (post.metaDescription !== undefined && post.metaDescription !== null && post.metaDescription.trim() !== '') {
        insertData.meta_description = post.metaDescription;
      }
      if (post.coverImage !== undefined && post.coverImage !== null && post.coverImage.trim() !== '') {
        // Normalize path separators (Windows backslashes to forward slashes for consistency)
        insertData.cover_image = post.coverImage.replace(/\\/g, '/');
      }
      if (post.publicationDate) {
        insertData.publication_date = post.publicationDate.toISOString();
      }

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues(insertData);

      await DatabaseUtils.executeQuery(
        `INSERT INTO posts (${columns}) VALUES (${placeholders})`,
        values
      );

      // Add subcategories
      if (postData.subcategoryIds && postData.subcategoryIds.length > 0) {
        for (const subcategoryId of postData.subcategoryIds) {
          await this.addSubcategory(id, subcategoryId);
        }
      }

      // Add attachments
      if (postData.attachmentFileIds && postData.attachmentFileIds.length > 0) {
        for (let i = 0; i < postData.attachmentFileIds.length; i++) {
          await this.addAttachment(id, postData.attachmentFileIds[i], i);
        }
      }

      // Add authors
      if (postData.authorIds && postData.authorIds.length > 0) {
        for (const authorId of postData.authorIds) {
          await this.addAuthor(id, authorId);
        }
      }

      this.logger.debug('Post created', { postId: id });
      return post;
    } catch (error) {
      const dbError = error as any;
      const errorMessage = dbError?.message || (error as Error).message;
      const errorCode = dbError?.code;
      
      this.logger.error('Failed to create post', error as Error, { 
        postData: {
          title: postData.title,
          slug: postData.slug,
          categoryId: postData.categoryId,
          creatorId: postData.creatorId,
          status: postData.status,
          hasSubcategories: !!postData.subcategoryIds?.length,
          hasAttachments: !!postData.attachmentFileIds?.length,
          hasAuthors: !!postData.authorIds?.length
        },
        errorMessage,
        errorCode,
        errorStack: (error as Error).stack
      });
      
      // Preserve the original error message for better debugging
      throw this.errorHandler.createDatabaseError(
        `Failed to create post: ${errorMessage}`,
        'create',
        'posts'
      );
    }
  }

  async findById(id: string): Promise<PublicationEntity | null> {
    try {
      const post = await DatabaseUtils.findOne<any>(
        'SELECT * FROM posts WHERE id = ?',
        [id]
      );

      if (!post) {
        return null;
      }

      return this.mapToPublicationEntity(post);
    } catch (error) {
      this.logger.error('Failed to find post by id', error as Error, { postId: id });
      throw this.errorHandler.createDatabaseError('Failed to find post by id', 'select', 'posts');
    }
  }

  async findBySlug(slug: string): Promise<PublicationEntity | null> {
    try {
      const post = await DatabaseUtils.findOne<any>(
        'SELECT * FROM posts WHERE slug = ?',
        [slug]
      );

      if (!post) {
        return null;
      }

      return this.mapToPublicationEntity(post);
    } catch (error) {
      this.logger.error('Failed to find post by slug', error as Error, { slug });
      throw this.errorHandler.createDatabaseError('Failed to find post by slug', 'select', 'posts');
    }
  }

  async findByCategory(categoryId: string, limit?: number, offset?: number): Promise<PublicationEntity[]> {
    try {
      let query = 'SELECT * FROM posts WHERE category_id = ? ORDER BY created_at DESC';
      const params: any[] = [categoryId];
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
        if (offset !== undefined) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const posts = await DatabaseUtils.findMany<any>(query, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to find posts by category', error as Error, { categoryId });
      throw this.errorHandler.createDatabaseError('Failed to find posts by category', 'select', 'posts');
    }
  }

  async findByStatus(status: PublicationStatus, limit?: number, offset?: number): Promise<PublicationEntity[]> {
    try {
      let query = 'SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC';
      const params: any[] = [status];
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
        if (offset !== undefined) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const posts = await DatabaseUtils.findMany<any>(query, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to find posts by status', error as Error, { status });
      throw this.errorHandler.createDatabaseError('Failed to find posts by status', 'select', 'posts');
    }
  }

  async findByCreator(creatorId: string, limit?: number, offset?: number): Promise<PublicationEntity[]> {
    try {
      let query = 'SELECT * FROM posts WHERE creator_id = ? ORDER BY created_at DESC';
      const params: any[] = [creatorId];
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
        if (offset !== undefined) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const posts = await DatabaseUtils.findMany<any>(query, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to find posts by creator', error as Error, { creatorId });
      throw this.errorHandler.createDatabaseError('Failed to find posts by creator', 'select', 'posts');
    }
  }

  async findAll(filters?: PublicationFilters, limit?: number, offset?: number): Promise<PublicationEntity[]> {
    try {
      let query = 'SELECT DISTINCT p.* FROM posts p';
      const params: any[] = [];
      const conditions: string[] = [];

      // Join with subcategories if filtering by subcategory
      if (filters?.subcategoryId) {
        query += ' INNER JOIN post_subcategories ps ON p.id = ps.post_id';
      }

      // Join with authors if filtering by author
      if (filters?.authorId) {
        query += ' INNER JOIN post_authors pa ON p.id = pa.post_id';
      }

      // Build WHERE conditions
      if (filters?.status) {
        conditions.push('p.status = ?');
        params.push(filters.status);
      }

      if (filters?.categoryId) {
        conditions.push('p.category_id = ?');
        params.push(filters.categoryId);
      }

      if (filters?.subcategoryId) {
        conditions.push('ps.subcategory_id = ?');
        params.push(filters.subcategoryId);
      }

      if (filters?.creatorId) {
        conditions.push('p.creator_id = ?');
        params.push(filters.creatorId);
      }

      if (filters?.authorId) {
        conditions.push('pa.author_id = ?');
        params.push(filters.authorId);
      }

      if (filters?.dateFrom) {
        conditions.push('p.created_at >= ?');
        params.push(filters.dateFrom);
      }

      if (filters?.dateTo) {
        conditions.push('p.created_at <= ?');
        params.push(filters.dateTo);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.meta_title LIKE ? OR p.meta_description LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY p.created_at DESC';
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
        if (offset !== undefined) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const posts = await DatabaseUtils.findMany<any>(query, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to find all posts', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all posts', 'select', 'posts');
    }
  }

  async countAll(filters?: PublicationFilters): Promise<number> {
    try {
      let query = 'SELECT COUNT(DISTINCT p.id) as count FROM posts p';
      const params: any[] = [];
      const conditions: string[] = [];

      // Join with subcategories if filtering by subcategory
      if (filters?.subcategoryId) {
        query += ' INNER JOIN post_subcategories ps ON p.id = ps.post_id';
      }

      // Join with authors if filtering by author
      if (filters?.authorId) {
        query += ' INNER JOIN post_authors pa ON p.id = pa.post_id';
      }

      // Build WHERE conditions (same as findAll)
      if (filters?.status) {
        conditions.push('p.status = ?');
        params.push(filters.status);
      }

      if (filters?.categoryId) {
        conditions.push('p.category_id = ?');
        params.push(filters.categoryId);
      }

      if (filters?.subcategoryId) {
        conditions.push('ps.subcategory_id = ?');
        params.push(filters.subcategoryId);
      }

      if (filters?.creatorId) {
        conditions.push('p.creator_id = ?');
        params.push(filters.creatorId);
      }

      if (filters?.authorId) {
        conditions.push('pa.author_id = ?');
        params.push(filters.authorId);
      }

      if (filters?.dateFrom) {
        conditions.push('p.created_at >= ?');
        params.push(filters.dateFrom);
      }

      if (filters?.dateTo) {
        conditions.push('p.created_at <= ?');
        params.push(filters.dateTo);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.meta_title LIKE ? OR p.meta_description LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const result = await DatabaseUtils.findOne<{ count: number }>(query, params);
      return result?.count || 0;
    } catch (error) {
      this.logger.error('Failed to count posts', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to count posts', 'select', 'posts');
    }
  }

  async findFeatured(limit?: number): Promise<PublicationEntity[]> {
    try {
      let query = 'SELECT * FROM posts WHERE is_featured = 1 AND status = ? ORDER BY created_at DESC';
      const params: any[] = ['approved'];
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const posts = await DatabaseUtils.findMany<any>(query, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to find featured posts', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find featured posts', 'select', 'posts');
    }
  }

  async findLeaderboard(limit?: number): Promise<PublicationEntity[]> {
    try {
      let query = 'SELECT * FROM posts WHERE is_leaderboard = 1 AND status = ? ORDER BY created_at DESC';
      const params: any[] = ['approved'];
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const posts = await DatabaseUtils.findMany<any>(query, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to find leaderboard posts', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find leaderboard posts', 'select', 'posts');
    }
  }

  async findPublished(limit?: number, offset?: number): Promise<PublicationEntity[]> {
    try {
      const now = new Date().toISOString();
      let query = `SELECT * FROM posts 
                   WHERE status = ? 
                   AND (publication_date IS NULL OR publication_date <= ?)
                   ORDER BY publication_date DESC, created_at DESC`;
      const params: any[] = ['approved', now];
      
      if (limit !== undefined) {
        query += ' LIMIT ?';
        params.push(limit);
        if (offset !== undefined) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const posts = await DatabaseUtils.findMany<any>(query, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to find published posts', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find published posts', 'select', 'posts');
    }
  }

  async search(query: string, limit?: number, offset?: number): Promise<PublicationEntity[]> {
    try {
      const searchTerm = `%${query}%`;
      let sql = `SELECT * FROM posts 
                 WHERE (title LIKE ? OR description LIKE ? OR meta_title LIKE ? OR meta_description LIKE ?)
                 ORDER BY created_at DESC`;
      const params: any[] = [searchTerm, searchTerm, searchTerm, searchTerm];
      
      if (limit !== undefined) {
        sql += ' LIMIT ?';
        params.push(limit);
        if (offset !== undefined) {
          sql += ' OFFSET ?';
          params.push(offset);
        }
      }

      const posts = await DatabaseUtils.findMany<any>(sql, params);
      return posts.map(post => this.mapToPublicationEntity(post));
    } catch (error) {
      this.logger.error('Failed to search posts', error as Error, { query });
      throw this.errorHandler.createDatabaseError('Failed to search posts', 'select', 'posts');
    }
  }

  async update(id: string, data: UpdatePublicationData): Promise<PublicationEntity> {
    try {
      const updateData: any = {
        updated_at: DatabaseUtils.getCurrentTimestamp()
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.metaTitle !== undefined) updateData.meta_title = data.metaTitle;
      if (data.metaDescription !== undefined) updateData.meta_description = data.metaDescription;
      if (data.coverImage !== undefined) updateData.cover_image = data.coverImage;
      if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.publicationDate !== undefined) {
        updateData.publication_date = data.publicationDate ? new Date(data.publicationDate).toISOString() : null;
      }
      if (data.hasComments !== undefined) updateData.has_comments = data.hasComments ? 1 : 0;
      if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured ? 1 : 0;
      if (data.isLeaderboard !== undefined) updateData.is_leaderboard = data.isLeaderboard ? 1 : 0;
      if (data.approvedBy !== undefined) updateData.approved_by = data.approvedBy;

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE posts SET ${set} WHERE id = ?`,
        params
      );

      // Update subcategories if provided
      if (data.subcategoryIds !== undefined) {
        // Remove all existing subcategories
        await DatabaseUtils.executeQuery(
          'DELETE FROM post_subcategories WHERE post_id = ?',
          [id]
        );
        // Add new ones
        if (data.subcategoryIds.length > 0) {
          for (const subcategoryId of data.subcategoryIds) {
            await this.addSubcategory(id, subcategoryId);
          }
        }
      }

      // Update attachments if provided
      if (data.attachmentFileIds !== undefined) {
        // Remove all existing attachments
        await DatabaseUtils.executeQuery(
          'DELETE FROM post_attachments WHERE post_id = ?',
          [id]
        );
        // Add new ones
        if (data.attachmentFileIds.length > 0) {
          for (let i = 0; i < data.attachmentFileIds.length; i++) {
            await this.addAttachment(id, data.attachmentFileIds[i], i);
          }
        }
      }

      // Update authors if provided
      if (data.authorIds !== undefined) {
        // Remove all existing authors
        await DatabaseUtils.executeQuery(
          'DELETE FROM post_authors WHERE post_id = ?',
          [id]
        );
        // Add new ones
        if (data.authorIds.length > 0) {
          for (const authorId of data.authorIds) {
            await this.addAuthor(id, authorId);
          }
        }
      }

      const updatedPost = await this.findById(id);
      if (!updatedPost) {
        throw new Error('Post not found after update');
      }

      this.logger.debug('Post updated', { postId: id });
      return updatedPost;
    } catch (error) {
      this.logger.error('Failed to update post', error as Error, { postId: id });
      throw this.errorHandler.createDatabaseError('Failed to update post', 'update', 'posts');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM posts WHERE id = ?',
        [id]
      );

      const deleted = result.changes > 0;
      this.logger.debug('Post delete attempt', { postId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete post', error as Error, { postId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete post', 'delete', 'posts');
    }
  }

  async incrementViews(id: string, isUnique: boolean): Promise<void> {
    try {
      await DatabaseUtils.executeQuery(
        'UPDATE posts SET views = views + 1 WHERE id = ?',
        [id]
      );

      if (isUnique) {
        await DatabaseUtils.executeQuery(
          'UPDATE posts SET unique_hits = unique_hits + 1 WHERE id = ?',
          [id]
        );
      }

      this.logger.debug('Post views incremented', { postId: id, isUnique });
    } catch (error) {
      this.logger.error('Failed to increment post views', error as Error, { postId: id });
      throw this.errorHandler.createDatabaseError('Failed to increment post views', 'update', 'posts');
    }
  }

  async recordView(postId: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT INTO post_views (id, post_id, user_id, ip_address, user_agent, viewed_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, postId, userId || null, ipAddress || null, userAgent || null, now]
      );

      this.logger.debug('Post view recorded', { postId, userId, ipAddress });
    } catch (error) {
      this.logger.error('Failed to record post view', error as Error, { postId });
      // Don't throw - view tracking failures shouldn't break requests
    }
  }

  async addSubcategory(postId: string, subcategoryId: string): Promise<boolean> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT OR IGNORE INTO post_subcategories (id, post_id, subcategory_id, created_at) VALUES (?, ?, ?, ?)`,
        [id, postId, subcategoryId, now]
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to add subcategory to post', error as Error, { postId, subcategoryId });
      throw this.errorHandler.createDatabaseError('Failed to add subcategory to post', 'insert', 'post_subcategories');
    }
  }

  async removeSubcategory(postId: string, subcategoryId: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM post_subcategories WHERE post_id = ? AND subcategory_id = ?',
        [postId, subcategoryId]
      );

      return result.changes > 0;
    } catch (error) {
      this.logger.error('Failed to remove subcategory from post', error as Error, { postId, subcategoryId });
      throw this.errorHandler.createDatabaseError('Failed to remove subcategory from post', 'delete', 'post_subcategories');
    }
  }

  async addAttachment(postId: string, fileId: string, displayOrder: number = 0): Promise<boolean> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT OR IGNORE INTO post_attachments (id, post_id, file_id, display_order, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, postId, fileId, displayOrder, now]
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to add attachment to post', error as Error, { postId, fileId });
      throw this.errorHandler.createDatabaseError('Failed to add attachment to post', 'insert', 'post_attachments');
    }
  }

  async removeAttachment(postId: string, fileId: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM post_attachments WHERE post_id = ? AND file_id = ?',
        [postId, fileId]
      );

      return result.changes > 0;
    } catch (error) {
      this.logger.error('Failed to remove attachment from post', error as Error, { postId, fileId });
      throw this.errorHandler.createDatabaseError('Failed to remove attachment from post', 'delete', 'post_attachments');
    }
  }

  async addAuthor(postId: string, authorId: string): Promise<boolean> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT OR IGNORE INTO post_authors (id, post_id, author_id, created_at) VALUES (?, ?, ?, ?)`,
        [id, postId, authorId, now]
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to add author to post', error as Error, { postId, authorId });
      throw this.errorHandler.createDatabaseError('Failed to add author to post', 'insert', 'post_authors');
    }
  }

  async removeAuthor(postId: string, authorId: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM post_authors WHERE post_id = ? AND author_id = ?',
        [postId, authorId]
      );

      return result.changes > 0;
    } catch (error) {
      this.logger.error('Failed to remove author from post', error as Error, { postId, authorId });
      throw this.errorHandler.createDatabaseError('Failed to remove author from post', 'delete', 'post_authors');
    }
  }

  async getWithRelations(id: string): Promise<PublicationWithRelations | null> {
    try {
      const post = await this.findById(id);
      if (!post) {
        return null;
      }

      // Get category
      const category = await DatabaseUtils.findOne<any>(
        'SELECT * FROM categories WHERE id = ?',
        [post.categoryId]
      );

      // Get creator
      const creator = await DatabaseUtils.findOne<any>(
        'SELECT id, username, email, first_name, last_name, avatar, language FROM users WHERE id = ?',
        [post.creatorId]
      );

      // Get approver if exists
      let approver = null;
      if (post.approvedBy) {
        approver = await DatabaseUtils.findOne<any>(
          'SELECT id, username, email, first_name, last_name, avatar, language FROM users WHERE id = ?',
          [post.approvedBy]
        );
      }

      // Get subcategories
      const subcategories = await DatabaseUtils.findMany<any>(
        `SELECT s.* FROM subcategories s
         INNER JOIN post_subcategories ps ON s.id = ps.subcategory_id
         WHERE ps.post_id = ?`,
        [id]
      );

      // Get attachments
      const attachmentFiles = await DatabaseUtils.findMany<any>(
        `SELECT f.* FROM files f
         INNER JOIN post_attachments pa ON f.id = pa.file_id
         WHERE pa.post_id = ?
         ORDER BY pa.display_order`,
        [id]
      );

      // Get authors
      const authors = await DatabaseUtils.findMany<any>(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.avatar, u.language FROM users u
         INNER JOIN post_authors pa ON u.id = pa.author_id
         WHERE pa.post_id = ?`,
        [id]
      );

      const result: PublicationWithRelations = {
        ...post,
        category: category ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          createdAt: new Date(category.created_at),
          updatedAt: new Date(category.updated_at)
        } : undefined,
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          email: creator.email,
          firstName: creator.first_name,
          lastName: creator.last_name,
          avatar: creator.avatar,
          password: '', // Don't expose password
          isActive: true,
          language: (creator.language || 'en') as 'ar' | 'en' | 'fr' | 'pt' | 'es' | 'sw',
          createdAt: new Date(),
          updatedAt: new Date()
        } : undefined,
        approver: approver ? {
          id: approver.id,
          username: approver.username,
          email: approver.email,
          firstName: approver.first_name,
          lastName: approver.last_name,
          avatar: approver.avatar,
          password: '',
          isActive: true,
          language: (approver.language || 'en') as 'ar' | 'en' | 'fr' | 'pt' | 'es' | 'sw',
          createdAt: new Date(),
          updatedAt: new Date()
        } : undefined,
        subcategories: subcategories.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.updated_at)
        })),
        attachments: attachmentFiles.map(f => ({
          id: f.id,
          filename: f.filename,
          originalName: f.original_name,
          filePath: f.file_path,
          thumbnailPath: f.thumbnail_path,
          fileSize: f.file_size,
          mimeType: f.mime_type,
          folderId: f.folder_id,
          userId: f.user_id,
          accessType: f.access_type,
          createdAt: new Date(f.created_at),
          updatedAt: new Date(f.updated_at)
        })),
        authors: authors.map(a => ({
          id: a.id,
          username: a.username,
          email: a.email,
          firstName: a.first_name,
          lastName: a.last_name,
          avatar: a.avatar,
          password: '',
          isActive: true,
          language: (a.language || 'en') as 'ar' | 'en' | 'fr' | 'pt' | 'es' | 'sw',
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      };

      return result;
    } catch (error) {
      this.logger.error('Failed to get post with relations', error as Error, { postId: id });
      throw this.errorHandler.createDatabaseError('Failed to get post with relations', 'select', 'posts');
    }
  }

  private mapToPublicationEntity(dbPost: any): PublicationEntity {
    return {
      id: dbPost.id,
      title: dbPost.title,
      slug: dbPost.slug,
      description: dbPost.description,
      metaTitle: dbPost.meta_title,
      metaDescription: dbPost.meta_description,
      coverImage: dbPost.cover_image,
      categoryId: dbPost.category_id,
      creatorId: dbPost.creator_id,
      approvedBy: dbPost.approved_by,
      status: dbPost.status,
      publicationDate: dbPost.publication_date ? new Date(dbPost.publication_date) : undefined,
      hasComments: Boolean(dbPost.has_comments),
      views: dbPost.views || 0,
      uniqueHits: dbPost.unique_hits || 0,
      isFeatured: Boolean(dbPost.is_featured),
      isLeaderboard: Boolean(dbPost.is_leaderboard),
      createdAt: new Date(dbPost.created_at),
      updatedAt: new Date(dbPost.updated_at)
    };
  }
}

