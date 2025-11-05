import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mutindo Media Hub API',
      version: '2.0.0',
      description: 'A comprehensive media hub API with file management, post creation, user authentication, and role-based access control. Features include file ownership, sharing, post management with categories, and admin/author workflows.',
      contact: {
        name: 'Henry',
        email: 'henry@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            avatar: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'username', 'email', 'isActive']
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'name', 'slug']
        },
        Subcategory: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'name', 'slug']
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            metaTitle: { type: 'string' },
            metaDescription: { type: 'string' },
            coverImage: { type: 'string' },
            categoryId: { type: 'string', format: 'uuid' },
            creatorId: { type: 'string', format: 'uuid' },
            approvedBy: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'rejected', 'approved', 'draft'] },
            publicationDate: { type: 'string', format: 'date-time' },
            hasComments: { type: 'boolean' },
            views: { type: 'integer' },
            uniqueHits: { type: 'integer' },
            isFeatured: { type: 'boolean' },
            isLeaderboard: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'title', 'slug', 'categoryId', 'creatorId', 'status']
        },
        PostWithRelations: {
          allOf: [
            { $ref: '#/components/schemas/Post' },
            {
              type: 'object',
              properties: {
                category: { $ref: '#/components/schemas/Category' },
                creator: { $ref: '#/components/schemas/User' },
                approver: { $ref: '#/components/schemas/User' },
                subcategories: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Subcategory' }
                },
                attachments: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/File' }
                },
                authors: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                }
              }
            }
          ]
        },
        CreatePostRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            slug: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            metaTitle: { type: 'string' },
            metaDescription: { type: 'string' },
            coverImage: { type: 'string' },
            categoryId: { type: 'string', format: 'uuid' },
            subcategoryIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            attachmentFileIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            authorIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            status: { type: 'string', enum: ['pending', 'draft'] },
            publicationDate: { type: 'string', format: 'date-time' },
            hasComments: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            isLeaderboard: { type: 'boolean' }
          },
          required: ['title', 'slug', 'categoryId']
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 }
          },
          required: ['email', 'password']
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            firstName: { type: 'string' },
            lastName: { type: 'string' }
          },
          required: ['username', 'email', 'password']
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string' },
                roles: { type: 'array', items: { type: 'string' } },
                permissions: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique file identifier'
            },
            filename: {
              type: 'string',
              description: 'Stored filename'
            },
            originalName: {
              type: 'string',
              description: 'Original filename'
            },
            filePath: {
              type: 'string',
              description: 'Path to the stored file. Files in folders are stored in uploads/{folderId}/filename, root files in uploads/filename'
            },
            thumbnailPath: {
              type: 'string',
              description: 'Path to the thumbnail (if available)'
            },
            fileSize: {
              type: 'integer',
              description: 'File size in bytes'
            },
            mimeType: {
              type: 'string',
              description: 'MIME type of the file'
            },
            folderId: {
              type: 'string',
              format: 'uuid',
              description: 'Parent folder ID (null for root)'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who owns this file'
            },
            accessType: {
              type: 'string',
              enum: ['private', 'public', 'shared'],
              description: 'File access type'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'File creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'File last update timestamp'
            }
          },
          required: ['id', 'filename', 'originalName', 'filePath', 'fileSize', 'mimeType', 'createdAt', 'updatedAt']
        },
        Folder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique folder identifier'
            },
            name: {
              type: 'string',
              description: 'Folder name'
            },
            parentId: {
              type: 'string',
              format: 'uuid',
              description: 'Parent folder ID (null for root folders)'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who owns this folder'
            },
            accessType: {
              type: 'string',
              enum: ['private', 'public', 'shared'],
              description: 'Folder access type'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Folder creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Folder last update timestamp'
            }
          },
          required: ['id', 'name', 'createdAt', 'updatedAt']
        },
        FolderWithFiles: {
          type: 'object',
          allOf: [
            { $ref: '#/components/schemas/Folder' },
            {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/File' },
                  description: 'Files in this folder'
                },
                subfolders: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/FolderWithFiles' },
                  description: 'Subfolders in this folder'
                }
              },
              required: ['files', 'subfolders']
            }
          ]
        },
        CreateFolderRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Folder name',
              minLength: 1,
              maxLength: 255
            },
            parentId: {
              type: 'string',
              format: 'uuid',
              description: 'Parent folder ID (optional)'
            }
          },
          required: ['name']
        },
        UpdateFolderRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'New folder name',
              minLength: 1,
              maxLength: 255
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          },
          required: ['success']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'VALIDATION_ERROR',
                    'FILE_NOT_FOUND',
                    'FOLDER_NOT_FOUND',
                    'UPLOAD_ERROR',
                    'THUMBNAIL_ERROR',
                    'DATABASE_ERROR',
                    'CONFIGURATION_ERROR',
                    'INTERNAL_ERROR',
                    'UNAUTHORIZED',
                    'FORBIDDEN',
                    'NOT_FOUND'
                  ]
                },
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Error timestamp'
                }
              },
              required: ['type', 'message', 'timestamp']
            }
          },
          required: ['success', 'error']
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['status', 'timestamp']
        }
      },
      parameters: {
        FileId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'File ID'
        },
        FolderId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Folder ID'
        },
        FolderIdQuery: {
          name: 'folderId',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Filter files by folder ID'
        },
        ParentIdQuery: {
          name: 'parentId',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Filter folders by parent ID'
        },
        SearchQuery: {
          name: 'q',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
            minLength: 1
          },
          description: 'Search query'
        },
        PostId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Post ID'
        },
        PostSlug: {
          name: 'slug',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'Post slug'
        },
        CategoryId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Category ID'
        },
        Limit: {
          name: 'limit',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          description: 'Maximum number of results'
        },
        Offset: {
          name: 'offset',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0
          },
          description: 'Number of results to skip'
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Authentication',
        description: 'User authentication and registration endpoints'
      },
      {
        name: 'Files',
        description: 'File management operations with user ownership and sharing'
      },
      {
        name: 'Folders',
        description: 'Folder management operations. Creates both database records and physical directories.'
      },
      {
        name: 'Posts (Public)',
        description: 'Public endpoints for viewing posts (featured, leaderboard, published posts)'
      },
      {
        name: 'Posts (Admin)',
        description: 'Admin/Author endpoints for managing posts (create, update, delete, approve)'
      },
      {
        name: 'Categories (Public)',
        description: 'Public endpoints for viewing categories'
      },
      {
        name: 'Categories (Admin)',
        description: 'Admin endpoints for managing categories'
      }
    ]
  },
  apis: ['./src/server.ts'] // Path to the API files
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: express.Application): void {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Mutindo File Manager API'
  }));

  // JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}
