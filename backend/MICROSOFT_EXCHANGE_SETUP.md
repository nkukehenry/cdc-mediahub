# Microsoft Exchange Email Configuration

## Quick Setup

Add these environment variables to your `backend/.env` file to enable Microsoft Exchange email service:

```env
# Enable email service (REQUIRED)
EMAIL_ENABLED=true

# Use Microsoft Exchange provider
EMAIL_PROVIDER=microsoft-graph

# From email address
EMAIL_FROM=notifications@africacdc.org
EMAIL_FROM_NAME=File Manager
EMAIL_REPLY_TO=notifications@africacdc.org

# Microsoft Exchange / Office 365 SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false

# Exchange Online Credentials
SMTP_USER=notifications@africacdc.org
SMTP_PASSWORD=your-app-password-or-password

# Optional: Microsoft Graph API OAuth2 (for future use)
# MICROSOFT_GRAPH_CLIENT_ID=your-client-id
# MICROSOFT_GRAPH_CLIENT_SECRET=your-client-secret
# MICROSOFT_GRAPH_TENANT_ID=your-tenant-id
```

## Important Configuration Details

### 1. EMAIL_PROVIDER
- Set to `microsoft-graph` to use Microsoft Exchange/Office 365
- This will use Exchange Online SMTP settings optimized for Microsoft Exchange

### 2. SMTP Configuration for Exchange Online

**SMTP_HOST**: `smtp.office365.com` (Standard Exchange Online SMTP server)

**SMTP_PORT**: 
- `587` - Recommended (STARTTLS)
- `465` - Alternative (SSL/TLS, requires `SMTP_SECURE=true`)

**SMTP_SECURE**: 
- `false` for port 587 (STARTTLS)
- `true` for port 465 (SSL/TLS)

### 3. Authentication

**SMTP_USER**: Your Office 365 email address (e.g., `notifications@africacdc.org`)

**SMTP_PASSWORD**: 
- **If MFA is enabled**: Use an **App Password** (recommended)
  - Go to: https://account.microsoft.com/security
  - Navigate to: Security > Advanced security options > App passwords
  - Create a new app password and use it here
- **If MFA is disabled**: Use your regular password

### 4. Email Addresses

- **EMAIL_FROM**: The email address that will appear as the sender
- **EMAIL_FROM_NAME**: The display name for the sender
- **EMAIL_REPLY_TO**: Email address for replies (can be same as FROM or different)

**Note**: The `SMTP_USER` email must have permission to send emails from the `EMAIL_FROM` address, or they should match.

## Complete Example Configuration

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./database.sqlite

# Email Service - Microsoft Exchange
EMAIL_ENABLED=true
EMAIL_PROVIDER=microsoft-graph
EMAIL_FROM=notifications@africacdc.org
EMAIL_FROM_NAME=File Manager
EMAIL_REPLY_TO=notifications@africacdc.org

# Exchange Online SMTP
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@africacdc.org
SMTP_PASSWORD=your-app-password-here

# JWT
JWT_SECRET=your-jwt-secret

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE_MB=50000
```

## Verification Steps

1. **Add the configuration** to your `.env` file
2. **Restart your server**
3. **Check server logs** for:
   ```
   Email service initialized successfully { provider: 'microsoft-graph' }
   SMTP connection verified successfully
   ```
4. **Test the email service** using the admin endpoint:
   ```bash
   POST /api/admin/email/test
   Authorization: Bearer YOUR_ADMIN_TOKEN
   Body: {
     "to": "test@example.com",
     "type": "custom"
   }
   ```

## Troubleshooting

### "Email service is disabled"
- Ensure `EMAIL_ENABLED=true` (exactly as shown, no spaces)

### "SMTP connection verification failed"
- Verify `SMTP_USER` and `SMTP_PASSWORD` are correct
- If MFA is enabled, ensure you're using an App Password
- Check that port 587 is not blocked by firewall
- Verify `SMTP_HOST=smtp.office365.com` is correct

### "Invalid login" or "Authentication failed"
- Double-check credentials
- Ensure you're using an App Password if MFA is enabled
- Verify the email account is active and not locked

### "Connection timeout"
- Check network connectivity
- Verify firewall allows outbound connections on port 587
- Try port 465 with `SMTP_SECURE=true` as an alternative

## Security Best Practices

1. **Use App Passwords**: Always use App Passwords when MFA is enabled
2. **Service Account**: Consider using a dedicated service account for sending emails
3. **Environment Variables**: Never commit `.env` files to version control
4. **TLS/SSL**: Use port 587 (STARTTLS) or 465 (SSL) for encrypted connections
5. **Limited Permissions**: The service account should only have minimum required permissions

## Testing Email

After configuration, you can test email functionality by:

1. **Creating a user** in the admin panel (sends welcome email)
2. **Resetting a password** (sends password reset email)
3. **Blocking/unblocking a user** (sends notification email)
4. **Using the test endpoint** `/api/admin/email/test`

## Differences: microsoft-graph vs smtp Provider

- **microsoft-graph**: Optimized for Exchange Online, uses Exchange-specific TLS settings
- **smtp**: Generic SMTP provider, works with any SMTP server

Both use SMTP under the hood, but `microsoft-graph` is configured specifically for Microsoft Exchange/Office 365 environments.

