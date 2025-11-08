import { Request, Response } from 'express';
import { ITagRepository } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class TagController {
  private logger = getLogger('TagController');
  private errorHandler = getErrorHandler();

  constructor(private tagRepository: ITagRepository) {}

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const includeUsage = req.query.includeUsage !== 'false';
      const tags = includeUsage
        ? await this.tagRepository.findAllWithUsage()
        : await this.tagRepository.findAll();

      res.json({
        success: true,
        data: { tags }
      });
    } catch (error) {
      this.logger.error('Failed to list tags', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}
