import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import { DatabaseConnection } from './database/DatabaseConnection';
import { DatabaseUtils } from './utils/DatabaseUtils';
import { FileRepository } from './repositories/FileRepository';
import { FolderRepository } from './repositories/FolderRepository';
import { FileService } from './services/FileService';
import { FolderService } from './services/FolderService';
import { CacheFactory, FileManagerCacheStrategy } from './services/CacheService';
import { ConfigurationService } from './services/ConfigurationService';
import { getLogger } from './utils/Logger';
import { getErrorHandler } from './utils/ErrorHandler';
import { setupSwagger } from './config/swagger';

export class FileManagerServer {
  private app: express.Application;
  private server: any;
  private logger = getLogger('FileManagerServer');
  private errorHandler = getErrorHandler();
  private config = ConfigurationService.prototype;

  // Services
  private dbConnection!: DatabaseConnection;
  private cacheService: any;
  private cacheStrategy: FileManagerCacheStrategy;
  
  // Repositories
  private fileRepository!: FileRepository;
  private folderRepository!: FolderRepository;
  
  // Services
  private fileService!: FileService;
  private folderService!: FolderService;

  constructor() {
    this.app = express();
    this.config = new ConfigurationService();
    this.cacheStrategy = new FileManagerCacheStrategy();
    this.setupServices();
    this.setupMiddleware();
    this.setupSwagger();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupServices(): void {
    // Database
    const dbConfig = this.config.getDatabaseConfig();
    this.dbConnection = new DatabaseConnection(dbConfig.filename);
    DatabaseUtils.initialize(this.dbConnection.getDatabase());

    // Cache
    const cacheConfig = this.config.getCacheConfig();
    this.cacheService = CacheFactory.createCacheService(cacheConfig);

    // Repositories
    this.fileRepository = new FileRepository();
    this.folderRepository = new FolderRepository();

    // Services
    const appConfig = this.config.getConfig();
    this.fileService = new FileService(
      appConfig.uploadPath,
      appConfig.thumbnailPath,
      appConfig.maxFileSize,
      appConfig.allowedMimeTypes
    );
    this.folderService = new FolderService(appConfig.uploadPath);

    // Inject repositories into services
    this.injectDependencies();

    this.logger.info('Services initialized successfully');
  }

  private injectDependencies(): void {
    // Inject repositories into services by replacing their methods
    (this.fileService as any).saveFileToDatabase = this.fileRepository.create.bind(this.fileRepository);
    (this.fileService as any).findFileById = this.fileRepository.findById.bind(this.fileRepository);
    (this.fileService as any).findFilesByFolder = this.fileRepository.findByFolder.bind(this.fileRepository);
    (this.fileService as any).searchFilesInDatabase = this.fileRepository.search.bind(this.fileRepository);
    (this.fileService as any).deleteFileFromDatabase = this.fileRepository.delete.bind(this.fileRepository);

    (this.folderService as any).saveFolderToDatabase = this.folderRepository.create.bind(this.folderRepository);
    (this.folderService as any).findFolderById = this.folderRepository.findById.bind(this.folderRepository);
    (this.folderService as any).findFoldersByParent = this.folderRepository.findByParent.bind(this.folderRepository);
    (this.folderService as any).updateFolderInDatabase = this.folderRepository.update.bind(this.folderRepository);
    (this.folderService as any).deleteFolderFromDatabase = this.folderRepository.delete.bind(this.folderRepository);
    (this.folderService as any).findFilesInFolder = this.fileRepository.findByFolder.bind(this.fileRepository);

    this.logger.debug('Dependencies injected successfully');
  }

  private setupMiddleware(): void {
    const serverConfig = this.config.getServerConfig();

    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: serverConfig.cors.origin,
      credentials: serverConfig.cors.credentials
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // File upload
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.config.getConfig().maxFileSize
      }
    });
    this.app.use('/api/files/upload', upload.single('file'));

    this.logger.info('Middleware setup completed');
  }

  private setupSwagger(): void {
    setupSwagger(this.app);
    this.logger.info('Swagger documentation setup completed');
  }

  private setupRoutes(): void {
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Health check
     *     description: Check if the server is running and healthy
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: Server is healthy
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/HealthResponse'
     */
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // File routes
    /**
     * @swagger
     * /api/files/upload:
     *   post:
     *     summary: Upload a file
     *     description: Upload a file to the file system
     *     tags: [Files]
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               file:
     *                 type: string
     *                 format: binary
     *                 description: The file to upload
     *               folderId:
     *                 type: string
     *                 format: uuid
     *                 description: Optional folder ID to upload to
     *             required:
     *               - file
     *     responses:
     *       201:
     *         description: File uploaded successfully
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         file:
     *                           $ref: '#/components/schemas/File'
     *       400:
     *         description: Validation error or file too large
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       422:
     *         description: Upload error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.post('/api/files/upload', (req, res) => {
      this.handleFileUpload(req, res);
    });

    /**
     * @swagger
     * /api/files/{id}/download:
     *   get:
     *     summary: Download a file
     *     description: Download a file by its ID
     *     tags: [Files]
     *     parameters:
     *       - $ref: '#/components/parameters/FileId'
     *     responses:
     *       200:
     *         description: File downloaded successfully
     *         content:
     *           application/octet-stream:
     *             schema:
     *               type: string
     *               format: binary
     *       404:
     *         description: File not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.get('/api/files/:id/download', (req, res) => {
      this.handleFileDownload(req, res);
    });

    /**
     * @swagger
     * /api/files:
     *   get:
     *     summary: List files
     *     description: Get a list of files, optionally filtered by folder
     *     tags: [Files]
     *     parameters:
     *       - $ref: '#/components/parameters/FolderIdQuery'
     *     responses:
     *       200:
     *         description: List of files
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         files:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/File'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.get('/api/files', (req, res) => {
      this.handleFileList(req, res);
    });

    /**
     * @swagger
     * /api/files/search:
     *   get:
     *     summary: Search files
     *     description: Search files by name
     *     tags: [Files]
     *     parameters:
     *       - $ref: '#/components/parameters/SearchQuery'
     *     responses:
     *       200:
     *         description: Search results
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         files:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/File'
     *       400:
     *         description: Search query required
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.get('/api/files/search', (req, res) => {
      this.handleFileSearch(req, res);
    });

    /**
     * @swagger
     * /api/files/{id}:
     *   delete:
     *     summary: Delete a file
     *     description: Delete a file by its ID
     *     tags: [Files]
     *     parameters:
     *       - $ref: '#/components/parameters/FileId'
     *     responses:
     *       200:
     *         description: File deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         deleted:
     *                           type: boolean
     *       404:
     *         description: File not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.delete('/api/files/:id', (req, res) => {
      this.handleFileDelete(req, res);
    });

    // Folder routes
    /**
     * @swagger
     * /api/folders:
     *   post:
     *     summary: Create a new folder
     *     description: Create a new folder in the file system
     *     tags: [Folders]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateFolderRequest'
     *     responses:
     *       201:
     *         description: Folder created successfully
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         folder:
     *                           $ref: '#/components/schemas/Folder'
     *       400:
     *         description: Validation error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.post('/api/folders', (req, res) => {
      this.handleFolderCreate(req, res);
    });

    /**
     * @swagger
     * /api/folders:
     *   get:
     *     summary: List folders
     *     description: Get a list of folders, optionally filtered by parent folder
     *     tags: [Folders]
     *     parameters:
     *       - $ref: '#/components/parameters/ParentIdQuery'
     *     responses:
     *       200:
     *         description: List of folders
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         folders:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/Folder'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
        this.app.get('/api/folders', (req, res) => {
          this.handleFolderList(req, res);
        });

        /**
         * @swagger
         * /api/folders/tree:
         *   get:
         *     summary: Get folder tree with nested files
         *     description: Get a hierarchical tree of folders with their files and subfolders
         *     tags: [Folders]
         *     parameters:
         *       - $ref: '#/components/parameters/ParentIdQuery'
         *     responses:
         *       200:
         *         description: Folder tree with nested files
         *         content:
         *           application/json:
         *             schema:
         *               allOf:
         *                 - $ref: '#/components/schemas/SuccessResponse'
         *                 - type: object
         *                   properties:
         *                     data:
         *                       type: object
         *                       properties:
         *                         folders:
         *                           type: array
         *                           items:
         *                             $ref: '#/components/schemas/FolderWithFiles'
         *       500:
         *         description: Internal server error
         *         content:
         *           application/json:
         *             schema:
         *               $ref: '#/components/schemas/ErrorResponse'
         */
        this.app.get('/api/folders/tree', (req, res) => {
          this.handleFolderTree(req, res);
        });

    /**
     * @swagger
     * /api/folders/{id}:
     *   put:
     *     summary: Update folder
     *     description: Update folder name
     *     tags: [Folders]
     *     parameters:
     *       - $ref: '#/components/parameters/FolderId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateFolderRequest'
     *     responses:
     *       200:
     *         description: Folder updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         folder:
     *                           $ref: '#/components/schemas/Folder'
     *       404:
     *         description: Folder not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.put('/api/folders/:id', (req, res) => {
      this.handleFolderUpdate(req, res);
    });

    /**
     * @swagger
     * /api/folders/{id}:
     *   delete:
     *     summary: Delete folder
     *     description: Delete a folder (must be empty)
     *     tags: [Folders]
     *     parameters:
     *       - $ref: '#/components/parameters/FolderId'
     *     responses:
     *       200:
     *         description: Folder deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/SuccessResponse'
     *                 - type: object
     *                   properties:
     *                     data:
     *                       type: object
     *                       properties:
     *                         deleted:
     *                           type: boolean
     *       400:
     *         description: Folder not empty or validation error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       404:
     *         description: Folder not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.delete('/api/folders/:id', (req, res) => {
      this.handleFolderDelete(req, res);
    });

    this.logger.info('Routes setup completed');
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(this.errorHandler.globalErrorHandler);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Route not found',
          timestamp: new Date().toISOString()
        }
      });
    });

    this.logger.info('Error handling setup completed');
  }

  // Route handlers
  private async handleFileUpload(req: express.Request, res: express.Response): Promise<void> {
    try {
      if (!req.file) {
        throw this.errorHandler.createValidationError('No file uploaded');
      }

      const { folderId } = req.body;
      const file = await this.fileService.upload(req.file, folderId);

      // Add full URLs for frontend
      const fileWithUrls = {
        ...file,
        downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`,
        thumbnailUrl: file.thumbnailPath ? `${req.protocol}://${req.get('host')}/${file.thumbnailPath.replace(/\\/g, '/')}` : null
      };

      res.status(201).json({
        success: true,
        data: { file: fileWithUrls }
      });
    } catch (error) {
      this.logger.error('File upload failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileDownload(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const fileInfo = await this.fileService.download(id);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.sendFile(fileInfo.filePath);
    } catch (error) {
      this.logger.error('File download failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileList(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { folderId } = req.query;
      const files = await this.fileService.getFiles(folderId as string || null);

      // Add full URLs for frontend
      const filesWithUrls = files.map(file => ({
        ...file,
        downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`,
        thumbnailUrl: file.thumbnailPath ? `${req.protocol}://${req.get('host')}/${file.thumbnailPath.replace(/\\/g, '/')}` : null
      }));

      res.json({
        success: true,
        data: { files: filesWithUrls }
      });
    } catch (error) {
      this.logger.error('File list failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileSearch(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        throw this.errorHandler.createValidationError('Search query is required');
      }

      const files = await this.fileService.searchFiles(q);

      res.json({
        success: true,
        data: { files }
      });
    } catch (error) {
      this.logger.error('File search failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileDelete(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.fileService.deleteFile(id);

      res.json({
        success: true,
        data: { deleted }
      });
    } catch (error) {
      this.logger.error('File deletion failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFolderCreate(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { name, parentId } = req.body;
      
      if (!name || typeof name !== 'string') {
        throw this.errorHandler.createValidationError('Folder name is required');
      }

      const folder = await this.folderService.createFolder(name, parentId);

      res.status(201).json({
        success: true,
        data: { folder }
      });
    } catch (error) {
      this.logger.error('Folder creation failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFolderList(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { parentId } = req.query;
      // Convert empty string to undefined for root folders
      const folderParentId = parentId && parentId !== '' ? parentId as string : undefined;
      const folders = await this.folderService.getFolders(folderParentId);

      res.json({
        success: true,
        data: { folders }
      });
    } catch (error) {
      this.logger.error('Folder list failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFolderTree(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { parentId } = req.query;
      // Convert empty string to undefined for root folders
      const folderParentId = parentId && parentId !== '' ? parentId as string : undefined;
      const folders = await this.folderService.getFoldersWithFiles(folderParentId);

      // Add full URLs for files in the tree
      const addUrlsToTree = (folderTree: any[]): any[] => {
        return folderTree.map(folder => ({
          ...folder,
          files: folder.files.map((file: any) => ({
            ...file,
            downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`,
            thumbnailUrl: file.thumbnailPath ? `${req.protocol}://${req.get('host')}/${file.thumbnailPath.replace(/\\/g, '/')}` : null
          })),
          subfolders: addUrlsToTree(folder.subfolders)
        }));
      };

      const foldersWithUrls = addUrlsToTree(folders);

      res.json({
        success: true,
        data: { folders: foldersWithUrls }
      });
    } catch (error) {
      this.logger.error('Folder tree failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFolderUpdate(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;

      const folder = await this.folderService.updateFolder(id, updateData);

      res.json({
        success: true,
        data: { folder }
      });
    } catch (error) {
      this.logger.error('Folder update failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFolderDelete(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.folderService.deleteFolder(id);

      res.json({
        success: true,
        data: { deleted }
      });
    } catch (error) {
      this.logger.error('Folder deletion failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async start(): Promise<void> {
    try {
      const serverConfig = this.config.getServerConfig();
      
      this.server = this.app.listen(serverConfig.port, serverConfig.host, () => {
        this.logger.info(`File Manager Server started on ${serverConfig.host}:${serverConfig.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      this.logger.error('Failed to start server', error as Error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down server...');
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.dbConnection) {
      await this.dbConnection.close();
    }
    
    if (this.cacheService && 'disconnect' in this.cacheService) {
      await this.cacheService.disconnect();
    }
    
    this.logger.info('Server shutdown completed');
    process.exit(0);
  }
}
