# Microsoft Graph API Email Configuration

## Environment Variables

Add these to your `backend/.env` file:

```env
# Enable email service
EMAIL_ENABLED=true

# Use Microsoft Graph API provider
EMAIL_PROVIDER=microsoft-graph

# Microsoft Graph API OAuth Configuration
# Option 1: EXCHANGE_EMAIL_* (Laravel-style naming)
EXCHANGE_EMAIL_TENANT_ID=your-tenant-id
EXCHANGE_EMAIL_CLIENT_ID=your-client-id
EXCHANGE_EMAIL_CLIENT_SECRET=your-client-secret

# Option 2: MICROSOFT_GRAPH_* (Alternative naming)
# MICROSOFT_GRAPH_TENANT_ID=your-tenant-id
# MICROSOFT_GRAPH_CLIENT_ID=your-client-id
# MICROSOFT_GRAPH_CLIENT_SECRET=your-client-secret

# Option 3: GRAPH_* (Short naming)
# GRAPH_TENANT_ID=your-tenant-id
# GRAPH_CLIENT_ID=your-client-id
# GRAPH_CLIENT_SECRET=your-client-secret

# From email address
EMAIL_FROM=notifications@africacdc.org
EMAIL_FROM_NAME=File Manager
EMAIL_REPLY_TO=notifications@africacdc.org
```

## Supported Environment Variable Names

The configuration service supports multiple naming conventions for flexibility:

### Tenant ID
- `EXCHANGE_EMAIL_TENANT_ID` (recommended, Laravel-style)
- `MICROSOFT_GRAPH_TENANT_ID`
- `GRAPH_TENANT_ID`

### Client ID
- `EXCHANGE_EMAIL_CLIENT_ID` (recommended, Laravel-style)
- `MICROSOFT_GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_ID`

### Client Secret
- `EXCHANGE_EMAIL_CLIENT_SECRET` (recommended, Laravel-style)
- `MICROSOFT_GRAPH_CLIENT_SECRET`
- `GRAPH_CLIENT_SECRET`

### From Email
- `EMAIL_FROM` (recommended)
- `FROM_EMAIL`
- `EMAIL_FROM_ADDRESS`

## Azure AD App Registration Setup

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to**: Azure Active Directory > App registrations
3. **Create a new app registration** or use existing
4. **Configure**:
   - **Name**: Your app name (e.g., "File Manager Email Service")
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Leave blank (using client credentials flow)

5. **Get your credentials**:
   - **Tenant ID**: Found in Azure AD > Overview
   - **Client ID**: Found in App registration > Overview (Application ID)
   - **Client Secret**: Create in App registration > Certificates & secrets

6. **API Permissions**:
   - Add permission > Microsoft Graph > Application permissions
   - Add: `Mail.Send` (Application permission)
   - Click "Grant admin consent" (required!)

## Required Permissions

For Client Credentials flow, you need:
- **Microsoft Graph API**: `Mail.Send` (Application permission)
- **Admin consent**: Must be granted by an Azure AD administrator

## Testing

After configuration:

1. **Restart your server**
2. **Check logs** for:
   ```
   Microsoft Graph OAuth initialized successfully
   Email service initialized successfully { provider: 'microsoft-graph' }
   ```
3. **Test email endpoint**:
   ```bash
   POST /api/admin/email/test
   Authorization: Bearer YOUR_ADMIN_TOKEN
   Body: {
     "to": "test@example.com",
     "type": "custom"
   }
   ```

## Troubleshooting

### "Microsoft Graph configuration required"
- Ensure all three values are set: `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`
- Check that variable names match one of the supported conventions

### "Failed to obtain initial Microsoft Graph token"
- Verify Azure AD app registration is correct
- Check that `Mail.Send` permission is granted with admin consent
- Verify client secret is valid and not expired
- Check tenant ID is correct

### "Failed to send email: HTTP 403"
- Admin consent not granted for `Mail.Send` permission
- App registration doesn't have correct permissions

### "Failed to send email: HTTP 401"
- Invalid client credentials
- Token expired (should auto-refresh)
- Check tenant ID, client ID, and client secret

## Notes

- Uses **Client Credentials Flow** for server-to-server authentication
- Tokens are automatically refreshed when they expire
- The `fromEmail` must be a valid mailbox in your Exchange/Office 365 organization
- The service account (client credentials) needs permission to send emails from that mailbox

