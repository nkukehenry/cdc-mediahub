import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mutindo File Manager API',
      version: '1.0.0',
      description: 'A modular file manager API with upload, browse, preview, and file picker capabilities. Features physical folder management, file storage in organized directories, and comprehensive error handling.',
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
      schemas: {
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
                    'INTERNAL_ERROR'
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
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Folders',
        description: 'Folder management operations. Creates both database records and physical directories.'
      },
      {
        name: 'Files',
        description: 'File management operations'
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
