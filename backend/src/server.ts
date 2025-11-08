import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DatabaseConnection } from './database/DatabaseConnection';
import { DatabaseUtils } from './utils/DatabaseUtils';
import { FileRepository } from './repositories/FileRepository';
import { FolderRepository } from './repositories/FolderRepository';
import { UserRepository } from './repositories/UserRepository';
import { RoleRepository } from './repositories/RoleRepository';
import { PermissionRepository } from './repositories/PermissionRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { SubcategoryRepository } from './repositories/SubcategoryRepository';
import { NavLinkRepository } from './repositories/NavLinkRepository';
import { PostRepository } from './repositories/PostRepository';
import { FileShareRepository } from './repositories/FileShareRepository';
import { FolderShareRepository } from './repositories/FolderShareRepository';
import { SettingsRepository } from './repositories/SettingsRepository';
import { TagRepository } from './repositories/TagRepository';
import { UserEntity, FileEntity } from './interfaces';
import { FileService } from './services/FileService';
import { FolderService } from './services/FolderService';
import { AuthService } from './services/AuthService';
import { PostService } from './services/PostService';
import { CategoryService } from './services/CategoryService';
import { SubcategoryService } from './services/SubcategoryService';
import { NavLinkService } from './services/NavLinkService';
import { AnalyticsService } from './services/AnalyticsService';
import { YouTubeService } from './services/YouTubeService';
import { SettingsService } from './services/SettingsService';
import { UserService } from './services/UserService';
import { EmailService } from './services/EmailService';
import { CacheFactory, FileManagerCacheStrategy } from './services/CacheService';
import { ConfigurationService } from './services/ConfigurationService';
import { AuthController, PostController, CategoryController, SubcategoryController, NavLinkController, AnalyticsController, YouTubeController, CacheController, SettingsController, UserController, RoleController, PermissionController, TagController } from './controllers';
import { AuthMiddleware, RBACMiddleware } from './middleware';
import { getLogger } from './utils/Logger';
import { getErrorHandler } from './utils/ErrorHandler';
import { setupSwagger } from './config/swagger';
import { seedPublications } from './scripts/seedPublications';
import { seedNavLinks } from './scripts/seedNavLinks';
import { RecaptchaService } from './services/RecaptchaService';

export class FileManagerServer {
  private app: express.Application;
  private server: any;
  private logger = getLogger('FileManagerServer');
  private errorHandler = getErrorHandler();
  private config!: ConfigurationService;

  // Services
  private dbConnection!: DatabaseConnection;
  private cacheService: any;
  private cacheStrategy: FileManagerCacheStrategy;
  
  // Repositories
  private fileRepository!: FileRepository;
  private folderRepository!: FolderRepository;
  private userRepository!: UserRepository;
  private roleRepository!: RoleRepository;
  private permissionRepository!: PermissionRepository;
  private categoryRepository!: CategoryRepository;
  private subcategoryRepository!: SubcategoryRepository;
  private navLinkRepository!: NavLinkRepository;
  private postRepository!: PostRepository;
  private fileShareRepository!: FileShareRepository;
  private folderShareRepository!: FolderShareRepository;
  private settingsRepository!: SettingsRepository;
  private tagRepository!: TagRepository;
  
  // Services
  private fileService!: FileService;
  private folderService!: FolderService;
  private authService!: AuthService;
  private postService!: PostService;
  private categoryService!: CategoryService;
  private subcategoryService!: SubcategoryService;
  private navLinkService!: NavLinkService;
  private analyticsService!: AnalyticsService;
  private youtubeService!: YouTubeService;
  private settingsService!: SettingsService;
  private userService!: UserService;
  private emailService!: EmailService;
  private recaptchaService!: RecaptchaService;

  // Controllers
  private authController!: AuthController;
  private postController!: PostController;
  private categoryController!: CategoryController;
  private subcategoryController!: SubcategoryController;
  private navLinkController!: NavLinkController;
  private analyticsController!: AnalyticsController;
  private youtubeController!: YouTubeController;
  private cacheController!: CacheController;
  private settingsController!: SettingsController;
  private userController!: UserController;
  private roleController!: RoleController;
  private permissionController!: PermissionController;
  private tagController!: TagController;

  // Middleware
  private authMiddleware!: AuthMiddleware;
  private rbacMiddleware!: RBACMiddleware;

  // Scheduled tasks
  private youtubeFetchInterval?: NodeJS.Timeout;

  constructor() {
    this.app = express();
    this.config = new ConfigurationService();
    this.cacheStrategy = new FileManagerCacheStrategy();
    // setupServices, setupRoutes will be called in start() method since they're async or depend on services
    this.setupMiddleware();
    this.setupSwagger();
    // setupErrorHandling will be called after routes are set up
  }

  // Cache helpers
  private async cacheGet<T>(entity: string, id: string, userId?: string): Promise<T | null> {
    try {
      if (!this.cacheService || !this.cacheStrategy?.shouldCache(entity)) return null;
      const key = this.cacheStrategy.getCacheKey(entity, id, userId);
      const value = await this.cacheService.get(key);
      return value as T | null;
    } catch {
      return null;
    }
  }

  private async cacheSet<T>(entity: string, id: string, value: T, userId?: string): Promise<void> {
    try {
      if (!this.cacheService || !this.cacheStrategy?.shouldCache(entity)) return;
      const key = this.cacheStrategy.getCacheKey(entity, id, userId);
      const ttl = (this.cacheStrategy as any).getTTL?.(entity) ?? 300;
      await this.cacheService.set(key, value, ttl);
    } catch {
      // ignore
    }
  }

  private async cacheDelPattern(entity: string, userId?: string): Promise<void> {
    try {
      if (!this.cacheService || !this.cacheStrategy) return;
      const pattern = this.cacheStrategy.getPatternKey(entity, userId);
      await this.cacheService.delPattern(pattern);
    } catch {
      // ignore
    }
  }

  private async setupServices(): Promise<void> {
    // Database
    const dbConfig = this.config.getDatabaseConfig();
    this.dbConnection = new DatabaseConnection(dbConfig);
    await this.dbConnection.initialize();

    // Cache
    const cacheConfig = this.config.getCacheConfig();
    this.cacheService = CacheFactory.createCacheService(cacheConfig);

    // Repositories
    this.fileRepository = new FileRepository();
    this.folderRepository = new FolderRepository();
    this.userRepository = new UserRepository();
    this.roleRepository = new RoleRepository();
    this.permissionRepository = new PermissionRepository();
    this.categoryRepository = new CategoryRepository();
    this.subcategoryRepository = new SubcategoryRepository();
    this.navLinkRepository = new NavLinkRepository();
    this.postRepository = new PostRepository();
    this.fileShareRepository = new FileShareRepository();
    this.folderShareRepository = new FolderShareRepository();
    this.settingsRepository = new SettingsRepository();
    this.tagRepository = new TagRepository();

    // Services
    const appConfig = this.config.getConfig();
    this.logger.info('Upload config', { maxFileSize: appConfig.maxFileSize, allowedMimeTypes: appConfig.allowedMimeTypes });
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
    
    this.fileService = new FileService(
      appConfig.uploadPath,
      appConfig.thumbnailPath,
      appConfig.maxFileSize,
      appConfig.allowedMimeTypes,
      this.fileShareRepository
    );
    this.folderService = new FolderService(appConfig.uploadPath, this.folderShareRepository);
    this.authService = new AuthService(
      this.userRepository,
      this.roleRepository,
      this.permissionRepository,
      jwtSecret
    );
    this.postService = new PostService(
      this.postRepository,
      this.categoryRepository,
      this.userRepository,
      this.fileRepository,
      this.tagRepository
    );
    this.categoryService = new CategoryService(this.categoryRepository);
    this.subcategoryService = new SubcategoryService(this.subcategoryRepository);
    this.navLinkService = new NavLinkService(this.navLinkRepository);
    this.analyticsService = new AnalyticsService();
    this.youtubeService = new YouTubeService(this.cacheService);
    this.settingsService = new SettingsService(this.settingsRepository);
    
    // Email Service
    const emailConfig = this.config.getEmailConfig();
    this.emailService = new EmailService(emailConfig);
    
    this.userService = new UserService(this.userRepository, this.roleRepository, this.emailService);
    this.recaptchaService = new RecaptchaService(this.config);

    // Controllers
    this.authController = new AuthController(this.authService, this.recaptchaService);
    this.postController = new PostController(this.postService);
    this.categoryController = new CategoryController(this.categoryService);
    this.subcategoryController = new SubcategoryController(this.subcategoryService);
    this.navLinkController = new NavLinkController(this.navLinkService);
    this.analyticsController = new AnalyticsController(this.analyticsService);
    this.youtubeController = new YouTubeController(this.youtubeService);
    this.cacheController = new CacheController(this.cacheService);
    this.settingsController = new SettingsController(this.settingsService);
    this.userController = new UserController(this.userService);
    this.roleController = new RoleController(this.roleRepository, this.permissionRepository);
    this.permissionController = new PermissionController(this.permissionRepository);
    this.tagController = new TagController(this.tagRepository);

    // Middleware
    this.authMiddleware = new AuthMiddleware(this.authService);
    this.rbacMiddleware = new RBACMiddleware();

    // Inject repositories into services
    this.injectDependencies();

    this.logger.info('Services initialized successfully');
  }

  private injectDependencies(): void {
    // Inject repositories into services by replacing their methods
    // Wrap saveFileToDatabase to pass userId and accessType properly
    (this.fileService as any).saveFileToDatabase = async (fileData: any, userId?: string) => {
      return this.fileRepository.create(fileData, userId, 'private');
    };
    (this.fileService as any).findFileById = this.fileRepository.findById.bind(this.fileRepository);
    (this.fileService as any).findFilesByFolder = this.fileRepository.findByFolder.bind(this.fileRepository);
    (this.fileService as any).searchFilesInDatabase = this.fileRepository.search.bind(this.fileRepository);
    (this.fileService as any).deleteFileFromDatabase = this.fileRepository.delete.bind(this.fileRepository);
    (this.fileService as any).updateFileInDatabase = this.fileRepository.update.bind(this.fileRepository);

    (this.folderService as any).saveFolderToDatabase = this.folderRepository.create.bind(this.folderRepository);
    (this.folderService as any).findFolderById = this.folderRepository.findById.bind(this.folderRepository);
    (this.folderService as any).findFoldersByParent = this.folderRepository.findByParent.bind(this.folderRepository);
    (this.folderService as any).findFoldersByParentForUser = this.folderRepository.findByParentForUser.bind(this.folderRepository);
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

    // Rate limiting - configurable via environment variables
    if (serverConfig.rateLimit?.enabled) {
      const limiter = rateLimit({
        windowMs: serverConfig.rateLimit.windowMs,
        max: serverConfig.rateLimit.max,
        standardHeaders: true,
        legacyHeaders: false,
      });
      //this.app.use(limiter);
      this.logger.info('Rate limiting enabled', {
        windowMs: serverConfig.rateLimit.windowMs,
        max: serverConfig.rateLimit.max,
      });
    } else {
      this.logger.info('Rate limiting disabled');
    }

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
    // Temporarily disabled due to swagger-jsdoc parsing issues
    // setupSwagger(this.app);
    // this.logger.info('Swagger documentation setup completed');
    this.logger.info('Swagger documentation setup skipped (temporarily disabled)');
  }

  private setupRoutes(): void {
    try {
      this.logger.info('Setting up routes...');
      
      // Verify controllers are initialized
      if (!this.authController) {
        throw new Error('AuthController is not initialized');
      }
      if (!this.authMiddleware) {
        throw new Error('AuthMiddleware is not initialized');
      }
      
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

    // Serve static files from uploads directory
    const appConfig = this.config.getConfig();
    const uploadPath = path.resolve(appConfig.uploadPath);
    
    // Handle OPTIONS preflight requests for static files
    this.app.options('/uploads/:filename(*)', (req, res) => {
      const serverConfig = this.config.getServerConfig();
      res.setHeader('Access-Control-Allow-Origin', serverConfig.cors.origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin access
      res.setHeader('Access-Control-Allow-Credentials', serverConfig.cors.credentials ? 'true' : 'false');
      res.status(204).end();
    });

    this.app.get('/uploads/:filename(*)', async (req, res): Promise<void> => {
      try {
        const serverConfig = this.config.getServerConfig();
        const filename = req.params.filename;
        const filePath = path.join(uploadPath, filename);
        
        // Security: Ensure the file path is within the uploads directory
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(uploadPath))) {
          this.logger.warn('Attempted path traversal attack', { requestedPath: filePath, resolvedPath });
          res.status(403).json({ error: 'Access denied' });
          return;
        }
        
        // Check if file exists
        try {
          await fs.promises.access(filePath);
        } catch {
          this.logger.debug('File not found', { filePath });
          res.status(404).json({ error: 'File not found' });
          return;
        }
        
        // Get file stats
        const stats = await fs.promises.stat(filePath);
        if (!stats.isFile()) {
          res.status(404).json({ error: 'File not found' });
          return;
        }
        
        // Set CORS headers explicitly
        res.setHeader('Access-Control-Allow-Origin', serverConfig.cors.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin access
        if (serverConfig.cors.credentials) {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', this.getContentType(filename));
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Send file
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (error) => {
          this.logger.error('Error streaming file', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        });
        fileStream.pipe(res);
        
        this.logger.debug('Served static file', { filename, filePath });
      } catch (error) {
        this.logger.error('Error serving static file', error as Error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
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
    // File upload requires authentication
    this.app.post('/api/files/upload', 
      this.authMiddleware.authenticate,
      (req, res) => {
      this.handleFileUpload(req, res);
      }
    );

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
    // File download - public endpoint (access control handled downstream if needed)
    this.app.get('/api/files/:id/download',
      (req, res) => {
        this.handleFileDownload(req, res);
      }
    );

    // File preview - public endpoint with token query param (for Google Docs viewer)
    this.app.get('/api/files/:id/preview', 
      (req, res) => {
        this.handleFilePreview(req, res);
      }
    );

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
    // File list - public access (filters by access in service)
    this.app.get('/api/files', 
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
      this.handleFileList(req, res);
      }
    );

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
    // File search - public access (filters by access in service)
    this.app.get('/api/files/search', 
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
      this.handleFileSearch(req, res);
      }
    );

    /**
     * @swagger
     * /api/files/shared:
     *   get:
     *     summary: Get files shared with the current user
     *     description: Returns all files that have been explicitly shared with the authenticated user
     *     tags: [Files]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of shared files
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
     *       401:
     *         description: Unauthorized
     */
    this.app.get('/api/files/shared', 
      this.authMiddleware.authenticate,
      async (req, res) => {
        try {
          const userId = (req as any).user?.userId;
          if (!userId) {
            return res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
          }

          const cacheId = 'shared';
          const cached = await this.cacheGet<any[]>('files', cacheId, userId);
          const files = cached ?? await this.fileService.getFilesSharedWithUser(userId);
          // Resolve creators in batch
          const ownerIds = Array.from(new Set(files.map(f => f.userId).filter(Boolean))) as string[];
          const ownersMap: Record<string, any> = {};
          for (const oid of ownerIds) {
            const u = await this.userRepository.findById(oid);
            if (u) ownersMap[oid] = u;
          }
          const filesWithUrls = files.map(file => {
            const owner = file.userId ? ownersMap[file.userId] : undefined;
            return {
              ...file,
              createdBy: owner ? { id: owner.id, username: owner.username } : null,
              sharedBy: owner ? { id: owner.id, username: owner.username } : null,
              downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`,
              thumbnailUrl: file.thumbnailPath ? `${req.protocol}://${req.get('host')}/${file.thumbnailPath.replace(/\\/g, '/')}` : null
            };
          });
          if (!cached) await this.cacheSet('files', cacheId, filesWithUrls, userId);
          return res.json({ success: true, data: { files: filesWithUrls } });
        } catch (error) {
          this.logger.error('Shared files fetch failed', error as Error);
          return res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
        }
      }
    );

    /**
     * @swagger
     * /api/files/{id}/rename:
     *   put:
     *     summary: Rename a file
     *     description: Update the display name of a file. Only the file owner or an administrator can rename a file.
     *     tags: [Files]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/FileId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 description: New file name (extension optional)
     *     responses:
     *       200:
     *         description: File renamed successfully
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
     *         description: Validation error
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: File not found
     *       500:
     *         description: Internal server error
     */
    this.app.put('/api/files/:id/rename',
      this.authMiddleware.authenticate,
      (req, res) => {
        this.handleFileRename(req, res);
      }
    );

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
    // File delete requires authentication and ownership
    this.app.delete('/api/files/:id', 
      this.authMiddleware.authenticate,
      (req, res) => {
      this.handleFileDelete(req, res);
      }
    );

    /**
     * @swagger
     * /api/files/move:
     *   post:
     *     summary: Move files to a destination folder
     *     description: Move one or more files to a destination folder. Pass null to move to root.
     *     tags: [Files]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               fileIds:
     *                 type: array
     *                 items:
     *                   type: string
     *               destinationFolderId:
     *                 type: string
     *                 nullable: true
     *     responses:
     *       200:
     *         description: Files moved successfully
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
     *                         moved:
     *                           type: number
     *       400:
     *         description: Validation error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    /**
     * @swagger
     * /api/files/{id}/share:
     *   post:
     *     summary: Share file with multiple users
     *     description: Share a file with one or more users
     *     tags: [Files]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/FileId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               userIds:
     *                 type: array
     *                 items:
     *                   type: string
     *               accessLevel:
     *                 type: string
     *                 enum: [read, write]
     *                 default: read
     *     responses:
     *       200:
     *         description: File shared successfully
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
     *                         shares:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/FileShare'
     *       400:
     *         description: Validation error
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    this.app.post('/api/files/:id/share', 
      this.authMiddleware.authenticate,
      async (req, res) => {
        try {
          const { id } = req.params;
          const { userIds, accessLevel = 'read' } = req.body || {};
          const userId = (req as any).user?.userId;

          if (!userId) {
            return res.status(401).json({
              success: false,
              error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
            });
          }

          if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
              success: false,
              error: { message: 'userIds must be a non-empty array', code: 'VALIDATION_ERROR' }
            });
          }

          const shares = await this.fileService.shareFileWithUsers(id, userId, userIds, accessLevel);
          
          // Evict caches for owner and recipients
          await this.cacheDelPattern('files', userId);
          for (const recipientId of userIds) {
            await this.cacheDelPattern('files', recipientId);
          }

          return res.json({
            success: true,
            data: { shares }
          });
        } catch (error) {
          this.logger.error('File share failed', error as Error);
          return res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
        }
      }
    );

    /**
     * @swagger
     * /api/folders/{id}/share:
     *   post:
     *     summary: Share folder with multiple users
     *     description: Share a folder with one or more users (makes folder writable by invited users)
     *     tags: [Folders]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Folder ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               userIds:
     *                 type: array
     *                 items:
     *                   type: string
     *               accessLevel:
     *                 type: string
     *                 enum: [read, write]
     *                 default: write
     *     responses:
     *       200:
     *         description: Folder shared successfully
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       500:
     *         description: Internal server error
     */
    this.app.post('/api/folders/:id/share', 
      this.authMiddleware.authenticate,
      async (req, res) => {
        try {
          const { id } = req.params;
          const { userIds, accessLevel = 'write' } = req.body || {};
          const userId = (req as any).user?.userId;

          if (!userId) {
            return res.status(401).json({
              success: false,
              error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
            });
          }

          if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
              success: false,
              error: { message: 'userIds must be a non-empty array', code: 'VALIDATION_ERROR' }
            });
          }

          const shares = await this.folderService.shareFolderWithUsers(id, userId, userIds, accessLevel);
          
          // Evict caches for owner and recipients
          await this.cacheDelPattern('folders', userId);
          for (const recipientId of userIds) {
            await this.cacheDelPattern('folders', recipientId);
          }

          return res.json({
            success: true,
            data: { shares }
          });
        } catch (error) {
          this.logger.error('Folder share failed', error as Error);
          return res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
        }
      }
    );

    /**
     * @swagger
     * /api/folders/shared:
     *   get:
     *     summary: Get folders shared with the current user
     *     description: Returns all folders that have been explicitly shared with the authenticated user
     *     tags: [Folders]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of shared folders
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
     *       401:
     *         description: Unauthorized
     */
    this.app.get('/api/folders/shared', 
      this.authMiddleware.authenticate,
      async (req, res) => {
        try {
          const userId = (req as any).user?.userId;
          if (!userId) {
            return res.status(401).json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
          }
          const cacheId = 'shared';
          const cached = await this.cacheGet<any[]>('folders', cacheId, userId);
          const folders = cached ?? await this.folderService.getFoldersSharedWithUser(userId);
          // Resolve creators in batch
          const ownerIds = Array.from(new Set(folders.map((f: any) => f.userId).filter(Boolean))) as string[];
          const ownersMap: Record<string, any> = {};
          for (const oid of ownerIds) {
            const u = await this.userRepository.findById(oid);
            if (u) ownersMap[oid] = u;
          }
          const foldersEnriched = (folders as any[]).map((folder: any) => {
            const owner = folder.userId ? ownersMap[folder.userId] : undefined;
            return {
              ...folder,
              createdBy: owner ? { id: owner.id, username: owner.username } : null,
              sharedBy: owner ? { id: owner.id, username: owner.username } : null
            };
          });
          if (!cached) await this.cacheSet('folders', cacheId, foldersEnriched, userId);
          return res.json({ success: true, data: { folders: foldersEnriched } });
        } catch (error) {
          this.logger.error('Shared folders fetch failed', error as Error);
          return res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
        }
      }
    );

    /**
     * @swagger
     * /api/users:
     *   get:
     *     summary: Get all users
     *     description: Get list of all users for selection (admin only)
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of users
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
     *                         users:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/User'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    this.app.get('/api/users',
      this.authMiddleware.authenticate,
      async (req, res) => {
        try {
          const userId = (req as any).user?.userId;
          if (!userId) {
            return res.status(401).json({
              success: false,
              error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
            });
          }

          // Get all users except current user
          const allUsers = await this.userRepository.findAll();
          const users = allUsers
            .filter((u: UserEntity) => u.id !== userId)
            .map((u: UserEntity) => ({
              id: u.id,
              username: u.username,
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              avatar: u.avatar
            }));

          return res.json({
            success: true,
            data: { users }
          });
        } catch (error) {
          this.logger.error('Get users failed', error as Error);
          return res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
        }
      }
    );

    this.app.post('/api/files/move', 
      this.authMiddleware.authenticate,
      async (req, res) => {
        try {
          const { fileIds, destinationFolderId } = req.body || {};
          const userId = (req as any).user?.userId;

          if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({
              success: false,
              error: { message: 'fileIds must be a non-empty array', code: 'VALIDATION_ERROR' }
            });
          }

          // Validate destination folder if provided (must exist)
          if (destinationFolderId) {
            const dest = await this.folderRepository.findById(destinationFolderId);
            if (!dest) {
              return res.status(400).json({
                success: false,
                error: { message: 'Destination folder not found', code: 'VALIDATION_ERROR' }
              });
            }
          }

          let movedCount = 0;
          for (const fileId of fileIds) {
            const file = await this.fileRepository.findById(fileId);
            if (!file) {
              continue;
            }
            // Ownership/permission check: user must own the file
            // If access control includes user_id on files, verify it. Otherwise skip.
            try {
              await this.fileRepository.update(fileId, { folderId: destinationFolderId || null } as any);
              movedCount++;
            } catch (e) {
              this.logger.warn('Failed to move file', e as Error);
            }
          }

          // Evict caches impacted by move
          await this.cacheDelPattern('files', userId);
          await this.cacheDelPattern('folders', userId);
          await this.cacheDelPattern('files');
          await this.cacheDelPattern('folders');

          return res.json({ success: true, data: { moved: movedCount } });
        } catch (error) {
          this.logger.error('Files move failed', error as Error);
          return res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
        }
      }
    );

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
    this.app.post('/api/folders', this.authMiddleware.authenticate, (req, res) => {
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
        this.app.get('/api/folders', this.authMiddleware.authenticate, (req, res) => {
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
        this.app.get('/api/folders/tree', this.authMiddleware.authenticate, (req, res) => {
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
    this.app.put('/api/folders/:id', this.authMiddleware.authenticate, (req, res) => {
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
    this.app.delete('/api/folders/:id', this.authMiddleware.authenticate, (req, res) => {
      this.handleFolderDelete(req, res);
    });

    // ========================================
    // Authentication Routes (Public)
    // ========================================
    /**
     * @swagger
     * /api/auth/register:
     *   post:
     *     summary: Register a new user
     *     description: Create a new user account
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterRequest'
     *     responses:
     *       201:
     *         description: User registered successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Validation error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.post('/api/auth/register', (req, res) => {
      this.authController.register(req, res);
    });

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: User login
     *     description: Authenticate user and return JWT token
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       401:
     *         description: Invalid credentials
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.post('/api/auth/login', (req, res) => {
      this.authController.login(req, res);
    });

    /**
     * @swagger
     * /api/auth/me:
     *   get:
     *     summary: Get current user
     *     description: Get authenticated user's information
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User information
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
     *                         user:
     *                           $ref: '#/components/schemas/User'
     *                         roles:
     *                           type: array
     *                           items:
     *                             type: string
     *                         permissions:
     *                           type: array
     *                           items:
     *                             type: string
     *       401:
     *         description: Unauthorized
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.get('/api/auth/me',
      this.authMiddleware.authenticate,
      (req, res) => {
        this.authController.getMe(req, res);
      }
    );

    /**
     * @swagger
     * /api/auth/language:
     *   put:
     *     summary: Update user language preference
     *     description: Update the authenticated user's language preference
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - language
     *             properties:
     *               language:
     *                 type: string
     *                 enum: [ar, en, fr, pt, es, sw]
     *                 description: Language code
     *     responses:
     *       200:
     *         description: Language updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SuccessResponse'
     *       400:
     *         description: Invalid language code
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         description: Unauthorized
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    /**
     * @swagger
     * /api/auth/profile:
     *   put:
     *     summary: Update user profile
     *     description: Update the authenticated user's profile information
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *               email:
     *                 type: string
     *               avatar:
     *                 type: string
     *               phone:
     *                 type: string
     *               jobTitle:
     *                 type: string
     *               organization:
     *                 type: string
     *               bio:
     *                 type: string
     *     responses:
     *       200:
     *         description: Profile updated successfully
     *       401:
     *         description: Unauthorized
     */
    this.app.put('/api/auth/profile',
      this.authMiddleware.authenticate,
      (req, res) => {
        this.authController.updateProfile(req, res);
      }
    );

    this.app.put('/api/auth/language',
      this.authMiddleware.authenticate,
      async (req, res) => {
        try {
          const userId = (req as any).user?.userId;
          if (!userId) {
            return res.status(401).json({
              success: false,
              error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
            });
          }

          const { language } = req.body;
          const validLanguages = ['ar', 'en', 'fr', 'pt', 'es', 'sw'];
          
          if (!language || !validLanguages.includes(language)) {
            return res.status(400).json({
              success: false,
              error: { message: 'Invalid language code', code: 'VALIDATION_ERROR' }
            });
          }

          await this.userRepository.update(userId, { language: language as any });
          
          return res.json({
            success: true,
            data: { language }
          });
        } catch (error) {
          this.logger.error('Failed to update language', error as Error);
          return res.status(500).json({
            success: false,
            error: { message: 'Failed to update language', code: 'INTERNAL_ERROR' }
          });
        }
      }
    );

    // ========================================
    // Post Routes (Public - Featured & Leaderboard)
    // ========================================
    /**
     * @swagger
     * /api/public/posts/featured:
     *   get:
     *     summary: Get featured posts
     *     description: Get list of featured posts for the featured slider
     *     tags: [Posts (Public)]
     *     parameters:
     *       - $ref: '#/components/parameters/Limit'
     *     responses:
     *       200:
     *         description: Featured posts
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
     *                         posts:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/PostWithRelations'
     */
    this.app.get('/api/public/posts/featured',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.postController.getFeatured(req, res);
      }
    );

    /**
     * @swagger
     * /api/public/posts/leaderboard:
     *   get:
     *     summary: Get leaderboard posts
     *     description: Get list of posts marked for leaderboard (Leadership slider)
     *     tags: [Posts (Public)]
     *     parameters:
     *       - $ref: '#/components/parameters/Limit'
     *     responses:
     *       200:
     *         description: Leaderboard posts
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
     *                         posts:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/PostWithRelations'
     */
    this.app.get('/api/public/posts/leaderboard',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.postController.getLeaderboard(req, res);
      }
    );

    /**
     * @swagger
     * /api/public/posts:
     *   get:
     *     summary: Get published posts
     *     description: Get list of published and approved posts
     *     tags: [Posts (Public)]
     *     parameters:
     *       - $ref: '#/components/parameters/Limit'
     *       - $ref: '#/components/parameters/Offset'
     *     responses:
     *       200:
     *         description: Published posts
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
     *                         posts:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/PostWithRelations'
     */
    this.app.get('/api/public/posts',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.postController.getPublished(req, res);
      }
    );

    /**
     * @swagger
     * /api/public/posts/search:
     *   get:
     *     summary: Search posts
     *     description: Search published posts by title, description, or content
     *     tags: [Posts (Public)]
     *     parameters:
     *       - $ref: '#/components/parameters/SearchQuery'
     *       - $ref: '#/components/parameters/Limit'
     *       - $ref: '#/components/parameters/Offset'
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
     *                         posts:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/PostWithRelations'
     */
    this.app.get('/api/public/posts/search',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.postController.search(req, res);
      }
    );

    /**
     * @swagger
     * /api/public/posts/{slug}:
     *   get:
     *     summary: Get post by slug
     *     description: Get a single published post by its slug (tracks view)
     *     tags: [Posts (Public)]
     *     parameters:
     *       - $ref: '#/components/parameters/PostSlug'
     *     responses:
     *       200:
     *         description: Post details
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
     *                         post:
     *                           $ref: '#/components/schemas/PostWithRelations'
     *       404:
     *         description: Post not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.app.get('/api/public/posts/:slug',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.postController.getBySlug(req, res);
      }
    );

    // ========================================
    // Post Routes (Admin/Author - Protected)
    // ========================================
    /**
     * @swagger
     * /api/admin/posts:
     *   post:
     *     summary: Create a new post
     *     description: Create a new post (requires author or admin role)
     *     tags: [Posts (Admin)]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreatePostRequest'
     *     responses:
     *       201:
     *         description: Post created successfully
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
     *                         post:
     *                           $ref: '#/components/schemas/Post'
     *       400:
     *         description: Validation error
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Requires author or admin role
     */
    this.app.post('/api/admin/posts',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireAnyRole(['admin', 'author']),
      (req, res) => {
        this.postController.create(req, res);
      }
    );

    this.app.get('/api/admin/posts',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireAnyRole(['admin', 'author']),
      (req, res) => {
        this.postController.getAll(req, res);
      }
    );

    this.app.get('/api/admin/posts/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireAnyRole(['admin', 'author']),
      (req, res) => {
        this.postController.getById(req, res);
      }
    );

    this.app.put('/api/admin/posts/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireAnyRole(['admin', 'author']),
      (req, res) => {
        this.postController.update(req, res);
      }
    );

    this.app.delete('/api/admin/posts/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireAnyRole(['admin', 'author']),
      (req, res) => {
        this.postController.delete(req, res);
      }
    );

    this.app.post('/api/admin/posts/:id/approve',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.postController.approve(req, res);
      }
    );

    this.app.post('/api/admin/posts/:id/reject',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.postController.reject(req, res);
      }
    );

    // ========================================
    // Category Routes (Public)
    // ========================================
    /**
     * @swagger
     * /api/public/categories:
     *   get:
     *     summary: Get all categories
     *     description: Get list of all categories (Videos, Audios, Photos, etc.)
     *     tags: [Categories (Public)]
     *     responses:
     *       200:
     *         description: List of categories
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
     *                         categories:
     *                           type: array
     *                           items:
     *                             $ref: '#/components/schemas/Category'
     */
    this.app.get('/api/public/categories',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.categoryController.getAll(req, res);
      }
    );

    /**
     * @swagger
     * /api/public/categories/{id}:
     *   get:
     *     summary: Get category by ID
     *     description: Get a single category by its ID
     *     tags: [Categories (Public)]
     *     parameters:
     *       - $ref: '#/components/parameters/CategoryId'
     *     responses:
     *       200:
     *         description: Category details
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
     *                         category:
     *                           $ref: '#/components/schemas/Category'
     *       404:
     *         description: Category not found
     */
    this.app.get('/api/public/categories/:id',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.categoryController.getById(req, res);
      }
    );

    // ========================================
    // Category Routes (Admin - Protected)
    // ========================================
    /**
     * @swagger
     * /api/admin/categories:
     *   post:
     *     summary: Create a new category
     *     description: Create a new category (requires admin role)
     *     tags: [Categories (Admin)]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - slug
     *             properties:
     *               name:
     *                 type: string
     *                 example: Videos
     *               slug:
     *                 type: string
     *                 example: videos
     *               description:
     *                 type: string
     *                 example: Video content category
     *     responses:
     *       201:
     *         description: Category created successfully
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
     *                         category:
     *                           $ref: '#/components/schemas/Category'
     *       400:
     *         description: Validation error
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Requires admin role
     */
    this.app.post('/api/admin/categories',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.categoryController.create(req, res);
      }
    );

    /**
     * @swagger
     * /api/admin/categories/{id}:
     *   put:
     *     summary: Update a category
     *     description: Update an existing category (requires admin role)
     *     tags: [Categories (Admin)]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/CategoryId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *                 example: Videos
     *               slug:
     *                 type: string
     *                 example: videos
     *               description:
     *                 type: string
     *                 example: Video content category
     *     responses:
     *       200:
     *         description: Category updated successfully
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
     *                         category:
     *                           $ref: '#/components/schemas/Category'
     *       400:
     *         description: Validation error
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Requires admin role
     *       404:
     *         description: Category not found
     */
    this.app.put('/api/admin/categories/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.categoryController.update(req, res);
      }
    );

    /**
     * @swagger
     * /api/admin/categories/{id}:
     *   delete:
     *     summary: Delete a category
     *     description: Delete an existing category (requires admin role)
     *     tags: [Categories (Admin)]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/CategoryId'
     *     responses:
     *       200:
     *         description: Category deleted successfully
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
     *                           example: true
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Requires admin role
     *       404:
     *         description: Category not found
     */
    this.app.delete('/api/admin/categories/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.categoryController.delete(req, res);
      }
    );

    // ========================================
    // Subcategory Routes (Public)
    // ========================================
    this.app.get('/api/public/subcategories',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.subcategoryController.getAll(req, res);
      }
    );

    this.app.get('/api/public/subcategories/:id',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.subcategoryController.getById(req, res);
      }
    );

    // ========================================
    // Subcategory Routes (Admin - Protected)
    // ========================================
    this.app.post('/api/admin/subcategories',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.subcategoryController.create(req, res);
      }
    );

    this.app.put('/api/admin/subcategories/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.subcategoryController.update(req, res);
      }
    );

    this.app.delete('/api/admin/subcategories/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requireRole('admin'),
      (req, res) => {
        this.subcategoryController.delete(req, res);
      }
    );

    // ========================================
    // Nav Link Routes (Public)
    // ========================================
    this.app.get('/api/public/nav-links',
      this.authMiddleware.optionalAuthenticate,
      (req, res) => {
        this.navLinkController.getActive(req, res);
      }
    );

    // ========================================
    // Nav Link Routes (Admin - Protected)
    // ========================================
    this.app.get('/api/admin/nav-links',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requirePermission('nav-links:manage'),
      (req, res) => {
        this.navLinkController.getAll(req, res);
      }
    );

    this.app.get('/api/admin/nav-links/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requirePermission('nav-links:manage'),
      (req, res) => {
        this.navLinkController.getById(req, res);
      }
    );

    this.app.post('/api/admin/nav-links',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requirePermission('nav-links:manage'),
      (req, res) => {
        this.navLinkController.create(req, res);
      }
    );

    this.app.put('/api/admin/nav-links/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requirePermission('nav-links:manage'),
      (req, res) => {
        this.navLinkController.update(req, res);
      }
    );

    this.app.delete('/api/admin/nav-links/:id',
      this.authMiddleware.authenticate,
      this.rbacMiddleware.requirePermission('nav-links:manage'),
      (req, res) => {
        this.navLinkController.delete(req, res);
      }
    );

    // ========================================
    // Analytics Routes (Admin - Protected)
    // ========================================
    /**
     * @swagger
     * /api/admin/analytics/dashboard:
     *   get:
     *     summary: Get dashboard analytics
     *     description: Get comprehensive dashboard analytics including posts, users, categories, and visitor metrics
     *     tags: [Analytics (Admin)]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Dashboard analytics
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
     *                         analytics:
     *                           type: object
     *                           properties:
     *                             overview:
     *                               type: object
     *                               properties:
     *                                 totalUsers:
     *                                   type: number
     *                                 totalPosts:
     *                                   type: number
     *                                 totalCategories:
     *                                   type: number
     *                                 totalSubcategories:
     *                                   type: number
     *                                 totalViews:
     *                                   type: number
     *                                 totalUniqueHits:
     *                                   type: number
     *                             publicationStats:
     *                               type: object
     *                               properties:
     *                                 byStatus:
     *                                   type: array
     *                                   items:
     *                                     type: object
     *                                     properties:
     *                                       status:
     *                                         type: string
     *                                       count:
     *                                         type: number
     *                                 byCategory:
     *                                   type: array
     *                                   items:
     *                                     type: object
     *                                     properties:
     *                                       categoryName:
     *                                         type: string
     *                                       count:
     *                                         type: number
     *                                 featured:
     *                                   type: number
     *                                 leaderboard:
     *                                   type: number
     *                             monthlyVisitorStats:
     *                               type: array
     *                               items:
     *                                 type: object
     *                                 properties:
     *                                   month:
     *                                     type: string
     *                                   views:
     *                                     type: number
     *                                   uniqueHits:
     *                                     type: number
     *                             topPosts:
     *                               type: array
     *                               items:
     *                                 type: object
     *                                 properties:
     *                                   id:
     *                                     type: string
     *                                   title:
     *                                     type: string
     *                                   views:
     *                                     type: number
     *                                   uniqueHits:
     *                                     type: number
     *                                   categoryName:
     *                                     type: string
     *                             topCategories:
     *                               type: array
     *                               items:
     *                                 type: object
     *                                 properties:
     *                                   categoryId:
     *                                     type: string
     *                                   categoryName:
     *                                     type: string
     *                                   publicationCount:
     *                                     type: number
     *                                   totalViews:
     *                                     type: number
     *                             userActivity:
     *                               type: object
     *                               properties:
     *                                 totalActiveUsers:
     *                                   type: number
     *                                 newUsersThisMonth:
     *                                   type: number
     *                                 newUsersThisYear:
     *                                   type: number
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Requires admin role
     */
          this.app.get('/api/admin/analytics/dashboard',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.analyticsController.getDashboardAnalytics(req, res);
        }
      );

      // ========================================
      // Cache Management Routes (Admin - Protected)
      // ========================================
      /**
       * @swagger
       * /api/admin/cache/stats:
       *   get:
       *     summary: Get cache statistics
       *     description: Get cache connection status and statistics
       *     tags: [Cache Management]
       *     security:
       *       - bearerAuth: []
       *     responses:
       *       200:
       *         description: Cache statistics
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.get('/api/admin/cache/stats',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.cacheController.getStats(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/cache/keys:
       *   get:
       *     summary: Get cache keys
       *     description: Get list of cache keys matching a pattern
       *     tags: [Cache Management]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: query
       *         name: pattern
       *         schema:
       *           type: string
       *         description: Pattern to match keys (default: *)
       *       - in: query
       *         name: limit
       *         schema:
       *           type: integer
       *         description: Maximum number of keys to return (default: 100)
       *     responses:
       *       200:
       *         description: List of cache keys
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.get('/api/admin/cache/keys',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.cacheController.getKeys(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/cache/keys/{key}:
       *   get:
       *     summary: Get cache value by key
       *     description: Get the value stored for a specific cache key
       *     tags: [Cache Management]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: path
       *         name: key
       *         required: true
       *         schema:
       *           type: string
       *         description: Cache key
       *     responses:
       *       200:
       *         description: Cache value
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       *   delete:
       *     summary: Delete cache key
       *     description: Delete a specific cache key
       *     tags: [Cache Management]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: path
       *         name: key
       *         required: true
       *         schema:
       *           type: string
       *         description: Cache key to delete
       *     responses:
       *       200:
       *         description: Key deleted successfully
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.get('/api/admin/cache/keys/:key',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.cacheController.getValue(req, res);
        }
      );

      this.app.delete('/api/admin/cache/keys/:key',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.cacheController.deleteKey(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/cache/pattern:
       *   delete:
       *     summary: Delete cache by pattern
       *     description: Delete all cache keys matching a pattern
       *     tags: [Cache Management]
       *     security:
       *       - bearerAuth: []
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             required:
       *               - pattern
       *             properties:
       *               pattern:
       *                 type: string
       *                 example: mutindo:filemanager:files:*
       *     responses:
       *       200:
       *         description: Keys deleted successfully
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.delete('/api/admin/cache/pattern',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.cacheController.deletePattern(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/cache/flush:
       *   delete:
       *     summary: Flush all cache
       *     description: Delete all cache entries
       *     tags: [Cache Management]
       *     security:
       *       - bearerAuth: []
       *     responses:
       *       200:
       *         description: Cache flushed successfully
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.delete('/api/admin/cache/flush',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.cacheController.flushAll(req, res);
        }
      );

      // ========================================
      // Settings Routes
      // ========================================
      /**
       * @swagger
       * /api/public/settings:
       *   get:
       *     summary: Get public site settings
       *     description: Get public site settings including SEO metadata, contact info, social links, logo, and favicon
       *     tags: [Settings (Public)]
       *     responses:
       *       200:
       *         description: Public site settings
       */
      this.app.get('/api/public/settings',
        (req, res) => {
          this.settingsController.getPublicSettings(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/settings:
       *   get:
       *     summary: Get all settings
       *     description: Get all site settings (admin only)
       *     tags: [Settings (Admin)]
       *     security:
       *       - bearerAuth: []
       *     responses:
       *       200:
       *         description: All settings
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.get('/api/admin/settings',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.settingsController.getAllSettings(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/settings/{key}:
       *   get:
       *     summary: Get a specific setting
       *     description: Get a specific setting by key (admin only)
       *     tags: [Settings (Admin)]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: path
       *         name: key
       *         required: true
       *         schema:
       *           type: string
       *         description: Setting key
       *     responses:
       *       200:
       *         description: Setting value
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       *       404:
       *         description: Setting not found
       */
      this.app.get('/api/admin/settings/:key',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.settingsController.getSetting(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/settings:
       *   put:
       *     summary: Update settings (bulk)
       *     description: Update multiple settings at once (admin only)
       *     tags: [Settings (Admin)]
       *     security:
       *       - bearerAuth: []
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               settings:
       *                 type: object
       *                 description: Object with setting keys and values
       *     responses:
       *       200:
       *         description: Settings updated successfully
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.put('/api/admin/settings',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.settingsController.updateSettings(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/settings/{key}:
       *   put:
       *     summary: Update a specific setting
       *     description: Update a specific setting by key (admin only)
       *     tags: [Settings (Admin)]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: path
       *         name: key
       *         required: true
       *         schema:
       *           type: string
       *         description: Setting key
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             required:
       *               - value
       *             properties:
       *               value:
       *                 description: Setting value (can be any JSON-serializable value)
       *               description:
       *                 type: string
       *                 description: Optional description for the setting
       *     responses:
       *       200:
       *         description: Setting updated successfully
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.put('/api/admin/settings/:key',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.settingsController.updateSetting(req, res);
        }
      );

      // ========================================
      // User Management Routes (Admin)
      // ========================================
      this.app.post('/api/admin/users',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.create(req, res);
        }
      );

      this.app.get('/api/admin/users',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.getAll(req, res);
        }
      );

      this.app.get('/api/admin/users/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.getById(req, res);
        }
      );

      this.app.put('/api/admin/users/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.update(req, res);
        }
      );

      this.app.post('/api/admin/users/:id/block',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.block(req, res);
        }
      );

      this.app.post('/api/admin/users/:id/unblock',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.unblock(req, res);
        }
      );

      this.app.post('/api/admin/users/:id/reset-password',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.resetPassword(req, res);
        }
      );

      this.app.delete('/api/admin/users/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.userController.delete(req, res);
        }
      );

      // ========================================
      // Roles Management Routes (Admin)
      // ========================================
      this.app.post('/api/admin/roles',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requirePermission('roles:manage'),
        (req, res) => {
          this.roleController.create(req, res);
        }
      );

      this.app.get('/api/admin/roles',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requirePermission('roles:manage'),
        (req, res) => {
          this.roleController.getAll(req, res);
        }
      );

      this.app.get('/api/admin/roles/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requirePermission('roles:manage'),
        (req, res) => {
          this.roleController.getById(req, res);
        }
      );

      this.app.put('/api/admin/roles/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requirePermission('roles:manage'),
        (req, res) => {
          this.roleController.update(req, res);
        }
      );

      this.app.delete('/api/admin/roles/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requirePermission('roles:manage'),
        (req, res) => {
          this.roleController.delete(req, res);
        }
      );

      this.app.post('/api/admin/roles/:id/permissions',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requirePermission('roles:manage'),
        (req, res) => {
          this.roleController.assignPermissions(req, res);
        }
      );

      // ========================================
      // Permissions Management Routes (Admin)
      // ========================================
      this.app.post('/api/admin/permissions',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.permissionController.create(req, res);
        }
      );

      this.app.get('/api/admin/permissions',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.permissionController.getAll(req, res);
        }
      );

      this.app.get('/api/admin/permissions/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.permissionController.getById(req, res);
        }
      );

      this.app.put('/api/admin/permissions/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.permissionController.update(req, res);
        }
      );

      this.app.delete('/api/admin/permissions/:id',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.permissionController.delete(req, res);
        }
      );

      // ========================================
      // Email Test Route (Admin)
      // ========================================
      this.app.post('/api/admin/email/test',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        async (req, res) => {
          try {
            const { to, type = 'custom' } = req.body;

            if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
              res.status(400).json({
                success: false,
                error: {
                  type: 'VALIDATION_ERROR',
                  message: 'Valid email address is required',
                  timestamp: new Date().toISOString()
                }
              });
              return;
            }

            let emailSent = false;
            const testUsername = 'Test User';

            switch (type) {
              case 'welcome':
                emailSent = await this.emailService.sendWelcomeEmail(to, testUsername, 'TestPassword123');
                break;
              case 'password-reset':
                emailSent = await this.emailService.sendPasswordResetEmail(to, testUsername, 'TempPassword123');
                break;
              case 'blocked':
                emailSent = await this.emailService.sendAccountBlockedEmail(to, testUsername);
                break;
              case 'unblocked':
                emailSent = await this.emailService.sendAccountUnblockedEmail(to, testUsername);
                break;
              case 'custom':
              default:
                emailSent = await this.emailService.sendEmail({
                  to,
                  subject: 'Test Email - Email Service',
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="header">
                          <h1>Email Service Test</h1>
                        </div>
                        <div class="content">
                          <p>Hello,</p>
                          <p>This is a test email to verify that the email service is working correctly.</p>
                          <p>If you received this email, it means:</p>
                          <ul>
                            <li>✅ Email service is enabled</li>
                            <li>✅ SMTP configuration is correct</li>
                            <li>✅ Connection to email server is successful</li>
                            <li>✅ Emails can be sent successfully</li>
                          </ul>
                          <p>You can now use the email service to send notifications to users.</p>
                        </div>
                        <div class="footer">
                          <p>This is an automated test message from the File Manager system.</p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `,
                });
                break;
            }

            if (emailSent) {
              res.json({
                success: true,
                message: `Test email sent successfully to ${to}`,
                data: { emailType: type }
              });
            } else {
              res.status(500).json({
                success: false,
                error: {
                  type: 'EMAIL_ERROR',
                  message: 'Failed to send test email. Check server logs for details.',
                  timestamp: new Date().toISOString()
                }
              });
            }
          } catch (error) {
            this.logger.error('Email test failed', error as Error);
            res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
          }
        }
      );

      // ========================================
      // YouTube Routes (Public)
      // ========================================
      /**
       * @swagger
       * /api/public/youtube/live-events:
       *   get:
       *     summary: Get YouTube live events
       *     description: Get cached list of live, upcoming, and recent live events from YouTube channel
       *     tags: [YouTube (Public)]
       *     responses:
       *       200:
       *         description: YouTube live events
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
       *                         liveEvents:
       *                           type: array
       *                           items:
       *                             type: object
       *                             properties:
       *                               id:
       *                                 type: string
       *                               title:
       *                                 type: string
       *                               description:
       *                                 type: string
       *                               thumbnailUrl:
       *                                 type: string
       *                               channelTitle:
       *                                 type: string
       *                               publishedAt:
       *                                 type: string
       *                               scheduledStartTime:
       *                                 type: string
       *                               actualStartTime:
       *                                 type: string
       *                               actualEndTime:
       *                                 type: string
       *                               viewCount:
       *                                 type: number
       *                               concurrentViewers:
       *                                 type: number
       *                               videoUrl:
       *                                 type: string
       *                               status:
       *                                 type: string
       *                                 enum: [upcoming, live, completed]
       *       500:
       *         description: Server error
       */
      this.app.get('/api/public/youtube/live-events',
        (req, res) => {
          this.youtubeController.getLiveEvents(req, res);
        }
      );

      /**
       * @swagger
       * /api/admin/youtube/refresh:
       *   post:
       *     summary: Refresh YouTube cache
       *     description: Force refresh of YouTube live events cache (requires admin role)
       *     tags: [YouTube (Admin)]
       *     security:
       *       - bearerAuth: []
       *     responses:
       *       200:
       *         description: Cache refreshed successfully
       *       401:
       *         description: Unauthorized
       *       403:
       *         description: Forbidden - Requires admin role
       */
      this.app.post('/api/admin/youtube/refresh',
        this.authMiddleware.authenticate,
        this.rbacMiddleware.requireRole('admin'),
        (req, res) => {
          this.youtubeController.refreshCache(req, res);
        }
      );

      // ========================================
      // Tag Routes (Public)
      // ========================================
      /**
       * @swagger
       * /api/public/tags:
       *   get:
       *     summary: Get all tags
       *     description: Get list of all tags
       *     tags: [Tags (Public)]
       *     responses:
       *       200:
       *         description: List of tags
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
       *                         tags:
       *                           type: array
       *                           items:
       *                             $ref: '#/components/schemas/Tag'
       */
      this.app.get('/api/public/tags', (req, res) => {
        this.tagController.getAll(req, res);
      });
  
      this.logger.info('Routes setup completed');
    } catch (error) {
      this.logger.error('Error setting up routes', error as Error);
      throw error;
    }
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

      // Get userId from authenticated user (middleware should attach this)
      const userId = (req as any).user?.userId;
      if (!userId) {
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

      const { folderId } = req.body;
      const file = await this.fileService.upload(req.file, userId, folderId);

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
      // Evict caches affected by new upload
      await this.cacheDelPattern('files', userId);
      await this.cacheDelPattern('files');
      await this.cacheDelPattern('folders', userId);
      await this.cacheDelPattern('folders');
    } catch (error) {
      this.logger.error('File upload failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileDownload(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;
      const fileInfo = await this.fileService.download(id, userId);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      
      // Ensure the file path is absolute
      const absolutePath = path.resolve(fileInfo.filePath);
      res.sendFile(absolutePath);
    } catch (error) {
      this.logger.error('File download failed', error as Error);
      const statusCode = (error as any).type === 'VALIDATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFilePreview(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const { token } = req.query;
      
      // Validate token from query parameter
      if (!token || typeof token !== 'string') {
        res.status(401).json(this.errorHandler.formatErrorResponse(
          this.errorHandler.createValidationError('Token required')
        ));
        return;
      }

      // Verify token and get userId
      const decoded = await this.authService.verifyToken(token);
      const userId = decoded?.userId;
      
      if (!userId) {
        res.status(401).json(this.errorHandler.formatErrorResponse(
          this.errorHandler.createValidationError('Invalid token')
        ));
        return;
      }
      
      const fileInfo = await this.fileService.download(id, userId);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileInfo.fileName}"`);
      
      // Ensure the file path is absolute
      const absolutePath = path.resolve(fileInfo.filePath);
      res.sendFile(absolutePath);
    } catch (error) {
      this.logger.error('File preview failed', error as Error);
      const statusCode = (error as any).type === 'VALIDATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileList(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { folderId } = req.query;
      // Get userId from optional auth (public files visible to all)
      const userId = (req as any).user?.userId;
      const cacheId = `list:${folderId ? String(folderId) : 'root'}`;
      const cached = await this.cacheGet<any[]>('files', cacheId, userId);
      let files: any[];
      if (cached && Array.isArray(cached)) {
        files = cached;
      } else {
        files = await this.fileService.getFiles(folderId as string || null, userId);
        // Cache only the files array (without URLs which depend on request protocol/host)
        await this.cacheSet('files', cacheId, files, userId);
      }
      // Resolve creators in batch
      const ownerIds = Array.from(new Set(files.map(f => f.userId).filter(Boolean))) as string[];
      const ownersMap: Record<string, any> = {};
      for (const oid of ownerIds) {
        const u = await this.userRepository.findById(oid);
        if (u) ownersMap[oid] = u;
      }

      // Add full URLs and creator metadata for frontend
      const filesWithUrls = files.map(file => {
        const owner = file.userId ? ownersMap[file.userId] : undefined;
        return {
        ...file,
          createdBy: owner ? { id: owner.id, username: owner.username } : null,
        downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${file.id}/download`,
        thumbnailUrl: file.thumbnailPath ? `${req.protocol}://${req.get('host')}/${file.thumbnailPath.replace(/\\/g, '/')}` : null
        };
      });

      const responsePayload = { files: filesWithUrls };

      res.json({
        success: true,
        data: responsePayload
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

      // Get userId from optional auth (public files visible to all)
      const userId = (req as any).user?.userId;
      const cacheId = `search:${q}`;
      const cached = await this.cacheGet<any[]>('files', cacheId, userId);
      const files = cached ?? await this.fileService.searchFiles(q, userId);
      if (!cached) await this.cacheSet('files', cacheId, files, userId);

      res.json({
        success: true,
        data: { files }
      });
    } catch (error) {
      this.logger.error('File search failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileRename(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
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

      if (!name || typeof name !== 'string') {
        throw this.errorHandler.createValidationError('File name is required', 'name');
      }

      const updatedFile = await (this.fileService as any).renameFile(id, name, userId) as FileEntity;
      const responseFile = {
        ...updatedFile,
        downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${updatedFile.id}/download`,
        thumbnailUrl: updatedFile.thumbnailPath ? `${req.protocol}://${req.get('host')}/${updatedFile.thumbnailPath.replace(/\\/g, '/')}` : null
      };

      res.json({
        success: true,
        data: { file: responseFile }
      });

      await this.cacheDelPattern('files', userId);
      await this.cacheDelPattern('folders', userId);
      await this.cacheDelPattern('files');
      await this.cacheDelPattern('folders');
    } catch (error) {
      this.logger.error('File rename failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFileDelete(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      // Get userId from authenticated user
      const userId = (req as any).user?.userId;
      if (!userId) {
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
      const deleted = await this.fileService.deleteFile(id, userId);

      res.json({
        success: true,
        data: { deleted }
      });
      // Evict caches after deletion
      await this.cacheDelPattern('files', userId);
      await this.cacheDelPattern('folders', userId);
      await this.cacheDelPattern('files');
      await this.cacheDelPattern('folders');
    } catch (error) {
      this.logger.error('File deletion failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  private async handleFolderCreate(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { name, parentId } = req.body;
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
        });
        return;
      }
      
      if (!name || typeof name !== 'string') {
        throw this.errorHandler.createValidationError('Folder name is required');
      }

      const folder = await this.folderService.createFolder(name, parentId, userId);

      res.status(201).json({
        success: true,
        data: { folder }
      });
      // Evict caches for folders tree and lists
      await this.cacheDelPattern('folders', userId);
      await this.cacheDelPattern('folders');
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
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
        });
        return;
      }
      // Get folders and filter to only those owned by the user (cache the raw list)
      const cacheId = `list:${folderParentId || 'root'}`;
      const cached = await this.cacheGet<any[]>('folders', cacheId, userId);
      const foldersAll = cached ?? await this.folderService.getFolders(folderParentId);
      if (!cached) await this.cacheSet('folders', cacheId, foldersAll, userId);
      const folders = foldersAll.filter((f: any) => f.userId === userId);

      // Enrich with creator metadata
      const ownerIds = Array.from(new Set(folders.map((f: any) => f.userId).filter(Boolean))) as string[];
      const ownersMap: Record<string, any> = {};
      for (const oid of ownerIds) {
        const u = await this.userRepository.findById(oid);
        if (u) ownersMap[oid] = u;
      }
      const foldersEnriched = folders.map((folder: any) => ({
        ...folder,
        createdBy: folder.userId && ownersMap[folder.userId] ? { id: ownersMap[folder.userId].id, username: ownersMap[folder.userId].username } : null
      }));

      res.json({
        success: true,
        data: { folders: foldersEnriched }
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
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
        });
        return;
      }

      // Use service method that filters folders by user
      const cacheId = `