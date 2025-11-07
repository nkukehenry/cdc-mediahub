# Email Service Testing Guide

## Quick Test Methods

### Method 1: Using the Admin Test Endpoint (Recommended)

1. **Start the server** and ensure email configuration is set in your `.env` file

2. **Make a POST request** to `/api/admin/email/test` with your admin authentication token:

```bash
curl -X POST http://localhost:3001/api/admin/email/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "type": "custom"
  }'
```

**Available email types:**
- `custom` - Simple test email (default)
- `welcome` - Welcome email template
- `password-reset` - Password reset email template
- `blocked` - Account blocked email template
- `unblocked` - Account unblocked email template

### Method 2: Test by Creating a User

1. Go to `/admin/users` in the admin panel
2. Click "Create User"
3. Fill in the form with a valid email address
4. Submit the form
5. Check the user's email inbox for the welcome email

### Method 3: Test by Resetting Password

1. Go to `/admin/users` in the admin panel
2. Find a user and click the actions menu (three dots)
3. Click "Reset Password"
4. Leave password field empty to generate a temporary password, or enter a new password
5. Click "Reset Password"
6. Check the user's email inbox for the password reset email

### Method 4: Test by Blocking/Unblocking a User

1. Go to `/admin/users` in the admin panel
2. Find a user and click the actions menu
3. Click "Block User" or "Unblock User"
4. Check the user's email inbox for the notification email

## Checking Email Service Status

### Server Logs

When the server starts, check for these log messages:

**Success:**
```
Email service initialized successfully { provider: 'smtp' }
SMTP connection verified successfully
```

**Failure:**
```
Failed to initialize email service
SMTP connection verification failed
Email service is disabled
```

### Configuration Check

Verify your `.env` file has the correct settings:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

## Troubleshooting

### Email Not Sending

1. **Check if email is enabled:**
   ```bash
   # In your .env file
   EMAIL_ENABLED=true
   ```

2. **Verify SMTP credentials:**
   - Ensure `SMTP_USER` and `SMTP_PASSWORD` are correct
   - For Office 365 with MFA, use an App Password

3. **Check server logs:**
   - Look for "Failed to send email" errors
   - Check for SMTP authentication errors

4. **Test SMTP connection manually:**
   ```bash
   # Use telnet to test SMTP connection
   telnet smtp.office365.com 587
   ```

### Common Error Messages

**"SMTP configuration required"**
- Solution: Set `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` in `.env`

**"Invalid login" or "Authentication failed"**
- Solution: Verify credentials, use App Password if MFA is enabled

**"Connection timeout"**
- Solution: Check network connectivity, firewall settings, and SMTP port

**"Email service is disabled"**
- Solution: Set `EMAIL_ENABLED=true` in `.env`

## Testing with Postman or Insomnia

1. **Set up a POST request:**
   - URL: `http://localhost:3001/api/admin/email/test`
   - Method: `POST`
   - Headers:
     - `Authorization: Bearer YOUR_ADMIN_TOKEN`
     - `Content-Type: application/json`

2. **Request Body:**
   ```json
   {
     "to": "test@example.com",
     "type": "custom"
   }
   ```

3. **Expected Response (Success):**
   ```json
   {
     "success": true,
     "message": "Test email sent successfully to test@example.com",
     "data": {
       "emailType": "custom"
     }
   }
   ```

4. **Expected Response (Failure):**
   ```json
   {
     "success": false,
     "error": {
       "type": "EMAIL_ERROR",
       "message": "Failed to send test email. Check server logs for details.",
       "timestamp": "2025-01-07T..."
     }
   }
   ```

## Testing Different Email Types

### Test Welcome Email
```json
{
  "to": "user@example.com",
  "type": "welcome"
}
```

### Test Password Reset Email
```json
{
  "to": "user@example.com",
  "type": "password-reset"
}
```

### Test Account Blocked Email
```json
{
  "to": "user@example.com",
  "type": "blocked"
}
```

### Test Account Unblocked Email
```json
{
  "to": "user@example.com",
  "type": "unblocked"
}
```

## Verification Checklist

- [ ] Email service is enabled (`EMAIL_ENABLED=true`)
- [ ] SMTP credentials are correct
- [ ] Server logs show "Email service initialized successfully"
- [ ] Test endpoint returns success response
- [ ] Email appears in recipient's inbox
- [ ] Email appears in recipient's spam folder (if not in inbox)
- [ ] Email content is properly formatted
- [ ] Email includes all expected information

## Next Steps

Once email is working:
1. Test all email types (welcome, password reset, blocked, unblocked)
2. Verify emails are being sent for actual user actions
3. Check email delivery rates and spam folder placement
4. Monitor server logs for any email sending errors

