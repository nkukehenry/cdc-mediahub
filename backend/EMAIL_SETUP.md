# Email Service Setup (Microsoft Exchange/Outlook)

This document explains how to configure the email service for sending user alerts and notifications.

## Overview

The email service supports Microsoft Exchange Online (Office 365) via SMTP. It's used to send:
- Welcome emails when users are created
- Password reset emails
- Account blocked/unblocked notifications
- Password changed notifications

## Configuration

### Environment Variables

Add the following variables to your `.env` file (or environment):

#### Basic Email Configuration

```env
# Enable/disable email service
EMAIL_ENABLED=true

# Email provider (smtp or microsoft-graph)
EMAIL_PROVIDER=smtp

# From email address
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App Name
EMAIL_REPLY_TO=support@yourdomain.com
```

#### SMTP Configuration (Microsoft Exchange Online)

For Microsoft Exchange Online (Office 365), use these settings:

```env
# SMTP Host (Office 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false

# Your Office 365 email credentials
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-app-password-or-password
```

**Important Notes:**
- For Office 365, use port 587 with `SMTP_SECURE=false`
- Use port 465 with `SMTP_SECURE=true` for SSL
- If you have Multi-Factor Authentication (MFA) enabled, you'll need to create an **App Password** instead of using your regular password
- The email address in `SMTP_USER` should match or be authorized to send from `EMAIL_FROM`

#### Alternative Environment Variable Names

For compatibility, you can also use these variable names:

```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-app-password-or-password
```

### Microsoft Graph API (Optional - Advanced)

For OAuth2 authentication with Microsoft Graph API, you can use:

```env
MICROSOFT_GRAPH_CLIENT_ID=your-client-id
MICROSOFT_GRAPH_CLIENT_SECRET=your-client-secret
MICROSOFT_GRAPH_TENANT_ID=your-tenant-id
```

**Note:** The current implementation uses SMTP. For full Microsoft Graph API support, additional packages would be required (`@azure/msal-node` and `@microsoft/microsoft-graph-client`).

## Setting Up Microsoft Exchange Online (Office 365)

### Option 1: Using Regular Password (No MFA)

1. Use your Office 365 email address and password
2. Set `SMTP_USER` to your email address
3. Set `SMTP_PASSWORD` to your password

### Option 2: Using App Password (Recommended for MFA)

1. Go to https://account.microsoft.com/security
2. Sign in with your Microsoft account
3. Navigate to **Security** > **Advanced security options**
4. Under **App passwords**, create a new app password
5. Use this app password in `SMTP_PASSWORD`

### Option 3: Using Service Account

1. Create a dedicated service account in Office 365
2. Use this account's credentials for `SMTP_USER` and `SMTP_PASSWORD`
3. Configure the account to have permission to send emails

## Testing Email Configuration

### 1. Check Server Logs

When the server starts, you should see:
```
Email service initialized successfully { provider: 'smtp' }
```

If there's an error, you'll see:
```
Failed to initialize email service
SMTP connection verification failed
```

### 2. Test by Creating a User

1. Create a new user through the admin panel
2. Check if a welcome email is sent to the user's email address
3. Check server logs for email sending status

### 3. Test Password Reset

1. Reset a user's password
2. Check if the password reset email is sent
3. Verify the temporary password is included in the email

## Email Templates

The service includes pre-built HTML email templates for:

- **Welcome Email**: Sent when a new user is created
- **Password Reset Email**: Sent when password is reset (includes temporary password)
- **Account Blocked Email**: Sent when an account is blocked
- **Account Unblocked Email**: Sent when an account is unblocked
- **Password Changed Email**: Sent when password is changed (future implementation)

All emails are HTML-formatted with inline CSS for better email client compatibility.

## Troubleshooting

### Email Service Not Sending

1. **Check if email is enabled:**
   - Verify `EMAIL_ENABLED=true` in your `.env` file

2. **Check SMTP credentials:**
   - Verify `SMTP_USER` and `SMTP_PASSWORD` are correct
   - For Office 365 with MFA, ensure you're using an App Password

3. **Check SMTP settings:**
   - Verify `SMTP_HOST=smtp.office365.com`
   - Verify `SMTP_PORT=587` (or 465 for SSL)
   - Verify `SMTP_SECURE=false` for port 587

4. **Check firewall/network:**
   - Ensure the server can reach `smtp.office365.com` on port 587
   - Check if any firewall is blocking SMTP connections

5. **Check server logs:**
   - Look for error messages in the server logs
   - Check for "Failed to send email" or "SMTP connection verification failed" messages

### Common Errors

**Error: "SMTP configuration required"**
- Solution: Set `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` environment variables

**Error: "Invalid login"**
- Solution: Verify credentials, use App Password if MFA is enabled

**Error: "Connection timeout"**
- Solution: Check network connectivity, firewall settings, and SMTP port

**Error: "Email service is disabled"**
- Solution: Set `EMAIL_ENABLED=true` in your `.env` file

## Security Best Practices

1. **Use App Passwords**: If MFA is enabled, always use App Passwords instead of your main password
2. **Service Account**: Consider using a dedicated service account for sending emails
3. **Environment Variables**: Never commit `.env` files to version control
4. **TLS**: Ensure TLS is enabled (port 587) for secure email transmission
5. **Rate Limiting**: Consider implementing rate limiting for email sending to prevent abuse

## Disabling Email Service

To disable the email service without removing configuration:

```env
EMAIL_ENABLED=false
```

When disabled, the service will log warnings but won't send emails. The application will continue to function normally.

