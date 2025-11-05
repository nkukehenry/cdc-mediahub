# Media Hub - File Manager & Admin Panel

A comprehensive media management system with file manager, content management, and admin panel capabilities. Built with Node.js/Express backend and Next.js frontend.

## 🚀 Features

### Core Functionality
- **File Management**: Upload, download, preview, organize files and folders
- **User Ownership**: Users own their files and folders
- **Multi-User Sharing**: Share files and folders with specific users
- **Public Folders**: Public folder where anyone can upload (owner-only delete)
- **Folder Management**: Create, navigate, delete empty folders
- **File Operations**: Move, delete, share multiple files/folders
- **Authentication**: JWT-based authentication with role-based access control (RBAC)
- **Localization**: Support for 6 AU languages (Arabic, English, French, Portuguese, Spanish, Kiswahili)

### Admin Panel
- **Dashboard**: Overview page with quick access to all sections
- **File Manager**: Full-featured file and folder management interface
- **Posts Management**: Create and manage posts with statuses (pending, draft, rejected, approved)
- **Categories Management**: Organize content with categories and subcategories
- **Cache Management**: Monitor and manage application cache
- **Settings**: Application configuration and preferences

### Technical Features
- **Caching**: Redis caching with automatic eviction on data changes
- **Rate Limiting**: Configurable rate limiting via environment variables
- **File Type Support**: Images, videos, audios, and all document formats
- **Configurable Limits**: Max file size configurable via environment variables
- **Error Handling**: Global error handling with toast notifications
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## 📁 Project Structure

```
file-manager/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── database/    # Database connection and migrations
│   │   ├── interfaces/  # TypeScript interfaces
│   │   ├── middleware/  # Authentication, RBAC middleware
│   │   ├── repositories/# Data access layer
│   │   ├── services/    # Business logic layer
│   │   └── server.ts     # Express server setup
│   └── config.env        # Environment configuration
├── frontend/             # Next.js frontend
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── locales/      # Translation files (6 languages)
│   │   ├── store/         # Redux Toolkit store
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
└── README.md             # This file
```

## 🏗️ Architecture

### Backend Architecture (Clean Architecture)

- **Repositories**: Data access layer with SQLite
  - `FileRepository`: File CRUD operations
  - `FolderRepository`: Folder CRUD operations
  - `UserRepository`: User management
  - `FileShareRepository`: File sharing logic
  - `FolderShareRepository`: Folder sharing logic
  
- **Services**: Business logic layer
  - `FileService`: File operations, validation, access control
  - `FolderService`: Folder operations, tree building
  - `AuthService`: Authentication and authorization
  - `ConfigurationService`: Environment-based configuration

- **Middleware**: Cross-cutting concerns
  - `AuthMiddleware`: JWT authentication
  - `RBACMiddleware`: Role-based access control
  - Rate limiting middleware

- **Database**: SQLite with migrations
  - User ownership fields (`user_id`, `access_type`)
  - Public folder support (`is_public`)
  - File and folder sharing tables

### Frontend Architecture

- **Components**: Modular React components
  - `AdminNav`: Navigation with dropdown support
  - `FileManager`: Main file management interface
  - `FileManagerNav`: Sidebar navigation
  - `FileListRow` / `FileGridCard`: File display components
  - `ShareModal`: Multi-user sharing interface
  - `FilePreviewModal`: File preview with fullscreen support

- **State Management**: Redux Toolkit
  - `fileManagerSlice`: File/folder state management
  - Async thunks for API calls
  - Error middleware for toast notifications

- **Localization**: JSON-based translation system
  - 6 language files in `locales/`
  - `useTranslation` hook for component-level translations
  - Language preference saved to user profile

## 🔧 Configuration

### Backend Environment Variables (`backend/config.env`)

```env
# Server Configuration
PORT=3001
HOST=localhost
CORS_ORIGIN=http://localhost:3000

# Database
DB_FILENAME=./database.sqlite

# JWT
JWT_SECRET=your-secret-key-change-in-production

# File Upload
UPLOAD_PATH=./uploads
THUMBNAIL_PATH=./thumbnails
MAX_FILE_SIZE_MB=50000
ALLOWED_FILE_TYPES=image/*,video/*,audio/*,application/pdf,text/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/rtf,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000

# Redis Cache (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend Environment Variables (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAX_FILE_SIZE_MB=50000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login (returns JWT token)
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/language` - Update user language preference

### Files
- `POST /api/files/upload` - Upload file (requires auth)
- `GET /api/files/:id/download` - Download file (requires auth)
- `GET /api/files/:id/preview` - Preview file (token query param)
- `GET /api/files` - List files (optional auth, filters by access)
- `GET /api/files/search` - Search files
- `GET /api/files/shared` - Get files shared with user (requires auth)
- `POST /api/files/:id/share` - Share file with users (requires auth)
- `POST /api/files/move` - Move files to folder (requires auth)
- `DELETE /api/files/:id` - Delete file (requires auth)

### Folders
- `POST /api/folders` - Create folder (requires auth)
- `GET /api/folders` - List folders (requires auth)
- `GET /api/folders/tree` - Get folder tree with files (requires auth)
- `GET /api/folders/shared` - Get folders shared with user (requires auth)
- `POST /api/folders/:id/share` - Share folder with users (requires auth)
- `PUT /api/folders/:id` - Update folder (requires auth)
- `DELETE /api/folders/:id` - Delete folder (requires auth, empty only)

### Users
- `GET /api/users` - Get all users for selection (requires auth, excludes current user)

## 🎨 UI Components & Styling

### Brand Colors (AU Colors)
- **Green**: `#00A651` (`au-green`)
- **Red**: `#E31E24` (`au-red`)
- **Gold**: `#FFC72C` (`au-gold`)
- **Bright White**: `#FFFFFF` (`au-white`)
- **Grey Text**: `#4A5568` (`au-grey-text`)
- **Corporate Green**: `#006747` (`au-corporate-green`)

### Component Standards
- All components use AU brand colors
- Consistent spacing and typography
- Responsive design (mobile-first)
- Localized text using `useTranslation` hook
- Toast notifications for user feedback
- Loading states and error handling

## 🔐 Security & Access Control

### User Ownership Model
- Users own files and folders they create
- Users can only see:
  - Their own files/folders
  - Files/folders explicitly shared with them
  - Public files/folders (if they have access)

### Public Folder
- Created automatically on database initialization
- Anyone can upload to public folders
- Only the uploader can delete their files
- Subfolders inherit public status from parent

### Sharing Model
- **Files**: Can be shared with read or write access
- **Folders**: Can be shared with read or write access (write makes folder writable)
- Multi-user sharing via multi-select interface
- Shared items appear in "Shared with Me" section

## 💾 Caching Strategy

### Cache Keys
- Files: `mutindo:filemanager:files:user:{userId}:{cacheId}`
- Folders: `mutindo:filemanager:folders:user:{userId}:{cacheId}`
- Public: `mutindo:filemanager:{entity}:public:{cacheId}`

### Cache TTL
- File lists: 5 minutes
- Folder lists: 5 minutes
- Individual files: 1 hour
- Individual folders: 1 hour
- Thumbnails: 24 hours

### Cache Eviction
Cache is automatically evicted on:
- File upload
- File delete
- File move
- File share
- Folder create/update/delete
- Folder share

## 🌍 Localization

### Supported Languages
1. **English** (en) - Default
2. **Arabic** (ar)
3. **French** (fr)
4. **Portuguese** (pt)
5. **Spanish** (es)
6. **Kiswahili** (sw)

### Implementation
- User language preference saved in database
- Language selector in admin navigation
- All UI text localized
- Public site uses Google Translator (future)

## 📝 Database Schema

### Key Tables
- `users`: User accounts with language preference
- `roles`: User roles
- `permissions`: Role permissions
- `files`: File metadata with `user_id`, `access_type`
- `folders`: Folder metadata with `user_id`, `access_type`, `is_public`
- `file_shares`: File sharing relationships
- `folder_shares`: Folder sharing relationships
- `categories`: Content categories
- `subcategories`: Subcategories (many-to-many with categories)
- `posts`: Content posts with rich metadata

## 🚦 Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run build
npm start
```

The backend will:
- Create SQLite database if it doesn't exist
- Run migrations to add new columns
- Seed default roles, permissions, admin user, and public folder structure
- Optionally seed publications if `SEED_PUBLICATIONS_ON_STARTUP=true` is set in `config.env`
- Start server on http://localhost:3001

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:3000

### Default Admin Credentials
- **Email**: admin@example.com
- **Password**: admin123
- **Role**: Admin (all permissions)

## 📊 Current Status

### ✅ Completed Features

#### Backend
- [x] User ownership and access control
- [x] File and folder sharing (multi-user)
- [x] Public folder support with inheritance
- [x] File operations (upload, download, preview, delete, move)
- [x] Folder operations (create, delete empty folders)
- [x] Caching with automatic eviction
- [x] Rate limiting (configurable)
- [x] Configurable file size limits
- [x] Support for all file types (images, videos, audios, documents)
- [x] User language preference API
- [x] Created By and Shared By metadata on files/folders

#### Frontend
- [x] Admin navigation with dropdown support
- [x] File Manager with list/grid views
- [x] File preview modal with fullscreen support
- [x] Multi-user sharing interface
- [x] Folder tree navigation
- [x] Public folder integration
- [x] "Shared with Me" section
- [x] Localization (6 languages)
- [x] Toast notifications for errors/success
- [x] File/folder sorting (name, date, size)
- [x] Empty state components
- [x] Dashboard page
- [x] Empty placeholder pages for Categories, Posts, Settings, Cache

### 🎯 Standards & Best Practices

#### Code Standards
- **Small Functions**: Functions should do one thing well
- **Clean Code**: Self-documenting code with minimal comments
- **TypeScript**: Strict typing throughout
- **Error Handling**: Centralized error handling with custom error types
- **Logging**: Structured logging with context
- **Testing**: Write testable code (tests to be added)

#### Git Workflow
- **Small Commits**: Atomic commits with clear messages
- **Rebuild Regularly**: Rebuild after major changes
- **Clean History**: Maintain clean commit history

#### Architecture Standards
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Dependency Injection**: Loose coupling
- **Interface-Based Design**: Contracts for all services
- **Modular Components**: Reusable React components

## 🔮 Planned Features

### Backend
- [ ] Posts CRUD operations
- [ ] Categories and subcategories management
- [ ] Post approval workflow
- [ ] Post views tracking
- [ ] Comments system
- [ ] Featured and leaderboard posts
- [ ] Public API endpoints for posts (featured, leaderboard)
- [ ] File versioning
- [ ] Bulk operations API
- [ ] Advanced search with filters

### Frontend
- [ ] Posts management interface
- [ ] Post editor with rich text
- [ ] Categories management interface
- [ ] Comments management
- [ ] Cache management interface
- [ ] Settings page
- [ ] User profile management
- [ ] Advanced file filters
- [ ] Drag and drop file organization
- [ ] File versioning UI

### Infrastructure
- [ ] Unit tests (backend)
- [ ] Integration tests
- [ ] E2E tests (frontend)
- [ ] CI/CD pipeline
- [ ] Docker containers
- [ ] Production deployment guide

## 📚 Documentation

- **API Documentation**: Available at `http://localhost:3001/api-docs` (Swagger)
- **Backend README**: See `backend/README.md`
- **Frontend README**: See `frontend/README.md`

## 🛠️ Development Guidelines

### Adding New Features

1. **Backend First**: Implement repository → service → controller
2. **Interfaces**: Define interfaces in `interfaces/index.ts`
3. **Error Handling**: Use `ErrorHandler` utility
4. **Logging**: Use `getLogger()` utility
5. **Caching**: Add cache eviction on mutations
6. **Swagger**: Document new endpoints

### Frontend Development

1. **Components**: Create reusable components in `components/`
2. **Localization**: Add translations to all 6 language files
3. **State Management**: Use Redux Toolkit for global state
4. **Styling**: Use AU brand colors from `config/theme.ts`
5. **Error Handling**: Use `useErrorHandler` hook for toasts

### Database Changes

1. **Migrations**: Add migration logic in `DatabaseConnection.ts`
2. **Schema Updates**: Update interfaces in `interfaces/index.ts`
3. **Seeding**: Update `seedDefaultData()` if needed

## 📄 License

MIT

## 👥 Contributing

This is a private project. For questions or suggestions, contact the project maintainer.

---

**Last Updated**: 2025-01-29

**Current Version**: 1.0.0
