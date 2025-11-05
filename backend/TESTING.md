# File Manager Backend Testing

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Start the Server
```bash
npm start
```

Or for testing:
```bash
node test-server.js
```

### 4. Access Documentation and Testing

The server will start on `http://localhost:3001`

#### 📚 Swagger Documentation
- **Interactive API Docs**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json

#### 🧪 Testing Methods

**Method 1: VS Code REST Client (Recommended)**
1. Install "REST Client" extension in VS Code
2. Open `backend/requests.rest`
3. Click "Send Request" above any endpoint
4. View responses directly in VS Code

**Method 2: Swagger UI (Interactive)**
1. Open http://localhost:3001/api-docs in your browser
2. Click "Try it out" on any endpoint
3. Fill in parameters and execute requests
4. View responses and schemas

**Method 3: Command Line Testing**
```bash
# Health check
curl http://localhost:3001/health

# Create folder
curl -X POST http://localhost:3001/api/folders \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Folder"}'

# List folders
curl http://localhost:3001/api/folders

# Upload file
curl -X POST http://localhost:3001/api/files/upload \
  -F "file=@test.txt" \
  -F "folderId=folder-id-here"

# List files
curl http://localhost:3001/api/files
```

**Method 4: PowerShell Testing**
```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:3001/health

# Create folder
Invoke-WebRequest -Uri http://localhost:3001/api/folders -Method POST -ContentType "application/json" -Body '{"name": "Test Folder"}'
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Folders
- `POST /api/folders` - Create folder
- `GET /api/folders` - List folders
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files` - List files
- `GET /api/files/search` - Search files
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

## Configuration

Edit `.env` to customize:
- `PORT` - Server port (default: 3001)
- `UPLOAD_PATH` - File upload directory
- `THUMBNAIL_PATH` - Thumbnail directory
- `MAX_FILE_SIZE` - Maximum file size in bytes
- `ALLOWED_FILE_TYPES` - Comma-separated MIME types
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port
- `DATABASE_URL` - MySQL connection URL

## Testing Workflow

1. **Start Server**: `npm start`
2. **Health Check**: Test `/health` endpoint
3. **Create Folders**: Create some test folders
4. **Upload Files**: Upload different file types
5. **Test Operations**: List, search, download files
6. **Test Errors**: Try invalid operations
7. **Check Logs**: Monitor server logs for details

## Expected Responses

### Success Response
```json
{
  "success": true,
  "data": {
    "file": { ... }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Error description",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Troubleshooting

### Server won't start
- Check if port 3001 is available
- Verify all dependencies are installed
- Check `.env` file exists (copy from `.env.example` if needed)

### File upload fails
- Check file size limits
- Verify MIME type is allowed
- Ensure upload directory exists

### Redis connection issues
- Server will fall back to memory cache
- Check Redis server is running
- Verify Redis configuration

### Database issues
- SQLite database will be created automatically
- Check file permissions in project directory
- Verify database path in configuration
