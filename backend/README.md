# Mutindo File Manager Backend

A modular, lightweight file manager backend built with Node.js, TypeScript, and SQLite.

## Features

- 🚀 **Modular Architecture**: Clean interfaces and dependency injection
- ⚡ **Redis Caching**: With graceful fallback to memory cache
- 🔒 **Authentication**: JWT-based authentication with role-based access
- 📁 **File Management**: Upload, download, browse, and organize files
- 🖼️ **Thumbnail Generation**: Automatic thumbnail creation for images
- 📱 **Mobile Responsive**: API designed for mobile-first applications
- 🛡️ **Security**: Rate limiting, CORS, helmet, and input validation
- 📊 **Logging**: Centralized logging with different levels
- 🔧 **Error Handling**: Comprehensive error handling with custom error types

## Quick Start

### Prerequisites

- Node.js 16+
- Redis (optional, falls back to memory cache)

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and update the configuration:

```env
PORT=3001
JWT_SECRET=your-secret-key
UPLOAD_PATH=./uploads
THUMBNAIL_PATH=./thumbnails
MAX_FILE_SIZE=104857600
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id/download` - Download file
- `GET /api/files` - List files
- `GET /api/files/search` - Search files
- `DELETE /api/files/:id` - Delete file

### Folders
- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

## Architecture

### Clean Architecture Principles

- **Interfaces**: Define contracts for all services
- **Repositories**: Data access layer with caching
- **Services**: Business logic layer
- **Controllers**: HTTP request/response handling
- **Middleware**: Cross-cutting concerns

### Design Patterns

- **Repository Pattern**: Data access abstraction
- **Strategy Pattern**: Cache strategies
- **Factory Pattern**: Service creation
- **Decorator Pattern**: Cached repositories
- **Dependency Injection**: Loose coupling

## Integration

This file manager is designed to be easily integrated into larger projects:

```typescript
import { FileManager } from '@mutindo/file-manager';

const fileManager = new FileManager();
await fileManager.initialize({
  uploadPath: './uploads',
  thumbnailPath: './thumbnails',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  jwtSecret: 'your-secret',
  enableThumbnails: true,
  enablePublicFiles: true
});

// Get services
const fileService = fileManager.getFileService();
const folderService = fileManager.getFolderService();
const authService = fileManager.getAuthService();
```

## Testing

```bash
npm test
```

## License

MIT
