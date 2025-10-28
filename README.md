# File Manager

A modular file manager with Node.js backend and Next.js frontend.

## Features

- **Backend**: Node.js with Express, SQLite, Redis caching
- **Frontend**: Next.js with Redux Toolkit, Tailwind CSS
- **Modular Design**: Easy to integrate into other projects
- **Clean Architecture**: Small, reusable functions
- **Mobile Responsive**: Touch-friendly interface
- **File Operations**: Upload, download, preview, organize
- **Folder Management**: Create, navigate, organize files

## Quick Start

### Backend
```bash
cd backend
npm install
npm run build
node test-server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Documentation

Visit `http://localhost:3001/api-docs` for interactive Swagger documentation.

## Architecture

- **Modular Components**: Reusable file manager widgets
- **Clean Interfaces**: Well-defined TypeScript interfaces
- **Small Functions**: Focused, single-responsibility functions
- **Error Handling**: Centralized error management
- **Caching**: Redis with graceful fallback
- **Logging**: Structured logging throughout
