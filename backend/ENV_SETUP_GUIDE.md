# Email Service - Quick Setup Guide

## Current Issue
You're seeing: `[FileManager:EmailService] Email service is disabled, skipping email send`

This means `EMAIL_ENABLED` is not set to `true` in your `.env` file.

## Quick Fix for Microsoft Exchange

Add these lines to your `backend/.env` file:

```env
# Enable email service (REQUIRED)
EMAIL_ENABLED=true

# Use Microsoft Exchange provider
EMAIL_PROVIDER=microsoft-graph

# From email (you already have EMAIL_FROM_ADDRESS, but we also support EMAIL_FROM)
EMAIL_FROM=notifications@africacdc.org
EMAIL_FROM_NAME=File Manager
EMAIL_REPLY_TO=notifications@africacdc.org

# SMTP Configuration for Office 365 / Exchange Online
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false

# SMTP Credentials (REPLACE WITH YOUR ACTUAL CREDENTIALS)
SMTP_USER=notifications@africacdc.org
SMTP_PASSWORD=your-app-password-here
```

## Important Notes

1. **EMAIL_ENABLED must be exactly `true`** (string) - this is the most important setting
2. **SMTP_PASSWORD**: 
   - If your Office 365 account has MFA enabled, you'll need an **App Password**
   - Go to https://account.microsoft.com/security > Advanced security options > App passwords
   - Generate a new app password and use it here
3. **SMTP_USER**: Should be your Office 365 email address
4. **SMTP_HOST**: Use `smtp.office365.com` for Office 365

## Testing

After adding these settings:

1. **Restart your server** (the email service initializes on server start)
2. **Check server logs** - you should see:
   ```
   Email service initialized successfully { provider: 'smtp' }
   SMTP connection verified successfully
   ```
3. **Test the email endpoint** (if you're an admin):
   ```bash
   POST http://localhost:3001/api/admin/email/test
   Authorization: Bearer YOUR_ADMIN_TOKEN
   Body: {
     "to": "your-test-email@example.com",
     "type": "custom"
   }
   ```

## Troubleshooting

### Still seeing "Email service is disabled"
- Make sure `EMAIL_ENABLED=true` is in your `.env` file
- Make sure there are no spaces: `EMAIL_ENABLED = true` (WRONG) vs `EMAIL_ENABLED=true` (CORRECT)
- Restart the server after making changes

### "SMTP connection verification failed"
- Check your SMTP credentials (username and password)
- If MFA is enabled, use an App Password, not your regular password
- Verify SMTP_HOST is correct: `smtp.office365.com`
- Check that port 587 is not blocked by firewall

### "Failed to send email"
- Check server logs for detailed error messages
- Verify the recipient email address is valid
- Check that your Office 365 account has permission to send emails

## Full Example .env Configuration

```env
# Database
DATABASE_PATH=./database.sqlite

# Server
PORT=3001
NODE_ENV=development

# Email Service Configuration
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
EMAIL_FROM=notifications@africacdc.org
EMAIL_FROM_NAME=File Manager
EMAIL_REPLY_TO=notifications@africacdc.org

# SMTP (Office 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@africacdc.org
SMTP_PASSWORD=your-app-password-here
```

