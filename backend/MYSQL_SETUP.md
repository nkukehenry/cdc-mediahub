# MySQL Database Setup Guide

This application now uses MySQL instead of SQLite. Follow these steps to configure MySQL.

## Environment Variables

Add the following environment variables to your `backend/.env` file:

### Option 1: Using Connection String (Recommended)
```env
DATABASE_URL=mysql://username:password@localhost:3306/database_name
```

### Option 2: Using Individual Configuration
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=filemanager
```

Or use alternative naming conventions:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=filemanager
```

Or:
```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=filemanager
```

## Database Creation

1. Create the database:
```sql
CREATE DATABASE filemanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Grant privileges (if needed):
```sql
GRANT ALL PRIVILEGES ON filemanager.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

## Important Changes from SQLite

1. **Data Types:**
   - `TEXT` → `VARCHAR(255)` or `TEXT`
   - `INTEGER` for booleans → `TINYINT(1)`
   - UUIDs stored as `VARCHAR(36)`

2. **SQL Syntax:**
   - `INSERT OR IGNORE` → `INSERT IGNORE`
   - `datetime('now')` → `NOW()`
   - `PRAGMA table_info()` → `INFORMATION_SCHEMA.COLUMNS`
   - `strftime()` → `DATE_FORMAT()`

3. **Auto Timestamps:**
   - MySQL uses `ON UPDATE CURRENT_TIMESTAMP` for `updated_at` columns
   - Tables will automatically update timestamps

## Verification

After setting up your environment variables and creating the database:

1. Start the backend server
2. The application will automatically:
   - Create all necessary tables
   - Create indexes
   - Seed default data (roles, permissions, admin user)
   - Run migrations for existing tables

## Default Admin Credentials

- **Username:** admin
- **Email:** admin@example.com
- **Password:** admin123

**⚠️ IMPORTANT:** Change the admin password after first login!

## Troubleshooting

### Connection Issues
- Verify MySQL is running: `mysql -u root -p`
- Check firewall settings if connecting to remote MySQL
- Ensure the database exists before starting the server

### Migration Issues
- If you're migrating from SQLite, ensure you export and import your data manually
- The application will create new tables automatically
- Existing data migration scripts may need to be run separately

### Permission Errors
- Ensure the MySQL user has CREATE, ALTER, INSERT, UPDATE, DELETE, and SELECT privileges
- Check that the database user has access to the `INFORMATION_SCHEMA` database

