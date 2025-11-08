import { IPostLikeRepository } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class PostLikeRepository implements IPostLikeRepository {
  private logger = getLogger('PostLikeRepository');
  private errorHandler = getErrorHandler();

  async addLike(postId: string, userId: string): Promise<void> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      await DatabaseUtils.executeQuery(
        `INSERT IGNORE INTO post_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)` ,
        [id, postId, userId, now]
      );
    } catch (error) {
      this.logger.error('Failed to add like', error as Error, { postId, userId });
      throw this.errorHandler.createDatabaseError('Failed to add like', 'insert', 'post_likes');
    }
  }

  async removeLike(postId: string, userId: string): Promise<void> {
    try {
      await DatabaseUtils.executeQuery(
        `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`,
        [postId, userId]
      );
    } catch (error) {
      this.logger.error('Failed to remove like', error as Error, { postId, userId });
      throw this.errorHandler.createDatabaseError('Failed to remove like', 'delete', 'post_likes');
    }
  }

  async hasUserLiked(postId: string, userId: string): Promise<boolean> {
    try {
      const like = await DatabaseUtils.findOne<{ id: string }>(
        `SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?`,
        [postId, userId]
      );
      return Boolean(like);
    } catch (error) {
      this.logger.error('Failed to check like', error as Error, { postId, userId });
      throw this.errorHandler.createDatabaseError('Failed to check like', 'select', 'post_likes');
    }
  }

  async countByPost(postId: string): Promise<number> {
    try {
      const result = await DatabaseUtils.findOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM post_likes WHERE post_id = ?`,
        [postId]
      );
      return result?.count ?? 0;
    } catch (error) {
      this.logger.error('Failed to count likes', error as Error, { postId });
      throw this.errorHandler.createDatabaseError('Failed to count likes', 'select', 'post_likes');
    }
  }
}
