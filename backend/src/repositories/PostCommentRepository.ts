import { IPostCommentRepository, PostCommentEntity, CreatePostCommentData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class PostCommentRepository implements IPostCommentRepository {
  private logger = getLogger('PostCommentRepository');
  private errorHandler = getErrorHandler();

  async create(commentData: CreatePostCommentData): Promise<PostCommentEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT INTO post_comments (id, post_id, user_id, author_name, author_email, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        [
          id,
          commentData.postId,
          commentData.userId ?? null,
          commentData.authorName ?? null,
          commentData.authorEmail ?? null,
          commentData.content,
          now,
        ]
      );

      return {
        id,
        postId: commentData.postId,
        userId: commentData.userId,
        authorName: commentData.authorName ?? null,
        authorEmail: commentData.authorEmail ?? null,
        content: commentData.content,
        createdAt: new Date(now),
      };
    } catch (error) {
      this.logger.error('Failed to create comment', error as Error, { commentData });
      throw this.errorHandler.createDatabaseError('Failed to create comment', 'insert', 'post_comments');
    }
  }

  async findByPost(postId: string, limit: number, offset: number): Promise<PostCommentEntity[]> {
    try {
      const safeLimit = Math.max(0, Math.floor(limit));
      const safeOffset = Math.max(0, Math.floor(offset));

      const comments = await DatabaseUtils.findMany<any>(
        `SELECT pc.*, u.username, u.first_name, u.last_name, u.avatar
         FROM post_comments pc
         LEFT JOIN users u ON pc.user_id = u.id
         WHERE pc.post_id = ?
         ORDER BY pc.created_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        [postId]
      );

      return comments.map((comment: any) => ({
        id: comment.id,
        postId: comment.post_id,
        userId: comment.user_id ?? undefined,
        authorName: comment.author_name ?? undefined,
        authorEmail: comment.author_email ?? undefined,
        content: comment.content,
        createdAt: new Date(comment.created_at),
        author: comment.user_id ? {
          id: comment.user_id,
          username: comment.username ?? undefined,
          firstName: comment.first_name ?? undefined,
          lastName: comment.last_name ?? undefined,
          avatar: comment.avatar ?? undefined,
        } : undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch comments', error as Error, { postId, limit, offset });
      throw this.errorHandler.createDatabaseError('Failed to fetch comments', 'select', 'post_comments');
    }
  }

  async countByPost(postId: string): Promise<number> {
    try {
      const result = await DatabaseUtils.findOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM post_comments WHERE post_id = ?`,
        [postId]
      );
      return result?.count ?? 0;
    } catch (error) {
      this.logger.error('Failed to count comments', error as Error, { postId });
      throw this.errorHandler.createDatabaseError('Failed to count comments', 'select', 'post_comments');
    }
  }

  async findById(id: string): Promise<PostCommentEntity | null> {
    try {
      const comment = await DatabaseUtils.findOne<any>(
        `SELECT pc.*, u.username, u.first_name, u.last_name, u.avatar
         FROM post_comments pc
         LEFT JOIN users u ON pc.user_id = u.id
         WHERE pc.id = ?`,
        [id]
      );

      if (!comment) {
        return null;
      }

      return {
        id: comment.id,
        postId: comment.post_id,
        userId: comment.user_id ?? undefined,
        authorName: comment.author_name ?? undefined,
        authorEmail: comment.author_email ?? undefined,
        content: comment.content,
        createdAt: new Date(comment.created_at),
        author: comment.user_id
          ? {
              id: comment.user_id,
              username: comment.username ?? undefined,
              firstName: comment.first_name ?? undefined,
              lastName: comment.last_name ?? undefined,
              avatar: comment.avatar ?? undefined,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to find comment by id', error as Error, { id });
      throw this.errorHandler.createDatabaseError('Failed to find comment', 'select', 'post_comments');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        `DELETE FROM post_comments WHERE id = ?`,
        [id]
      );
      return (result as any)?.affectedRows ? (result as any).affectedRows > 0 : true;
    } catch (error) {
      this.logger.error('Failed to delete comment', error as Error, { id });
      throw this.errorHandler.createDatabaseError('Failed to delete comment', 'delete', 'post_comments');
    }
  }
}
