import { ConfidentialClientApplication, AuthenticationResult, ClientCredentialRequest, AuthorizationCodeRequest, RefreshTokenRequest } from '@azure/msal-node';
import { getLogger } from '../utils/Logger';
import axios, { AxiosInstance } from 'axios';

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
}

export interface ExchangeOAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scope?: string;
  authMethod: 'client_credentials' | 'authorization_code';
}

/**
 * Microsoft Exchange OAuth Handler for Node.js
 * Handles OAuth 2.0 authentication with Microsoft Graph API
 * Supports both Client Credentials and Authorization Code flows
 */
export class ExchangeOAuth {
  private logger = getLogger('ExchangeOAuth');
  private config: ExchangeOAuthConfig;
  private msalApp: ConfidentialClientApplication;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private tokenStorage: Map<string, OAuthToken> = new Map();

  constructor(config: ExchangeOAuthConfig) {
    this.config = {
      scope: config.scope || 'https://graph.microsoft.com/.default',
      redirectUri: config.redirectUri || 'http://localhost:3001/auth/callback',
      ...config
    };

    // Initialize MSAL Confidential Client Application
    const msalConfig = {
      auth: {
        clientId: this.config.clientId,
        authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
        clientSecret: this.config.clientSecret,
      },
    };

    this.msalApp = new ConfidentialClientApplication(msalConfig);
  }

  /**
   * Get the authorization URL for OAuth Authorization Code flow
   */
  async getAuthorizationUrl(): Promise<string> {
    const state = this.generateState();
    const authCodeUrlParameters = {
      scopes: this.config.scope?.split(' ') || ['https://graph.microsoft.com/.default'],
      redirectUri: this.config.redirectUri!,
      state: state,
    };

    try {
      const url = await this.msalApp.getAuthCodeUrl(authCodeUrlParameters);
      
      // Store state for verification (in production, use session storage)
      this.tokenStorage.set('oauth_state', {
        accessToken: state,
        expiresAt: new Date(Date.now() + 600000), // 10 minutes
        tokenType: 'state'
      } as OAuthToken);
      
      return url;
    } catch (error) {
      this.logger.error('Failed to get authorization URL', error as Error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token (Authorization Code flow)
   */
  async exchangeCodeForToken(code: string, state: string): Promise<boolean> {
    // Verify state parameter
    const storedState = this.tokenStorage.get('oauth_state');
    if (!storedState || storedState.accessToken !== state) {
      throw new Error('Invalid state parameter');
    }

    try {
      const tokenRequest: AuthorizationCodeRequest = {
        code: code,
        scopes: this.config.scope?.split(' ') || ['https://graph.microsoft.com/.default'],
        redirectUri: this.config.redirectUri!,
      };

      const response = await this.msalApp.acquireTokenByCode(tokenRequest);

      if (response && response.accessToken) {
        this.accessToken = response.accessToken;
        // MSAL Node handles refresh tokens internally, we don't need to store them manually
        // For authorization code flow, MSAL will use the account to refresh tokens automatically
        this.refreshToken = null; // MSAL manages refresh tokens internally
        this.tokenExpiresAt = response.expiresOn || new Date(Date.now() + 3600000); // Default 1 hour

        // Store tokens
        this.storeTokens();

        // Clear state
        this.tokenStorage.delete('oauth_state');

        this.logger.info('Successfully exchanged code for token');
        return true;
      }

      throw new Error('Failed to exchange code for token: No access token in response');
    } catch (error) {
      this.logger.error('Failed to exchange code for token', error as Error);
      throw error;
    }
  }

  /**
   * Get access token using Client Credentials flow
   */
  async getClientCredentialsToken(): Promise<string> {
    try {
      const clientCredentialRequest: ClientCredentialRequest = {
        scopes: this.config.scope?.split(' ') || ['https://graph.microsoft.com/.default'],
      };

      const response = await this.msalApp.acquireTokenByClientCredential(clientCredentialRequest);

      if (response && response.accessToken) {
        this.accessToken = response.accessToken;
        this.tokenExpiresAt = response.expiresOn || new Date(Date.now() + 3600000); // Default 1 hour

        // Store tokens
        this.storeTokens();

        this.logger.info('Successfully obtained client credentials token');
        return this.accessToken;
      }

      throw new Error('Failed to get client credentials token: No access token in response');
    } catch (error) {
      this.logger.error('Failed to get client credentials token', error as Error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * Note: For Client Credentials flow, tokens are obtained fresh each time
   * For Authorization Code flow, MSAL handles refresh automatically via account cache
   */
  async refreshAccessToken(): Promise<boolean> {
    // For client credentials flow, just get a new token
    if (this.config.authMethod === 'client_credentials') {
      try {
        await this.getClientCredentialsToken();
        return true;
      } catch (error) {
        this.logger.error('Failed to refresh token via client credentials', error as Error);
        throw error;
      }
    }

    // For authorization code flow, we need the account from the cache
    // MSAL manages refresh tokens internally, so we'll use acquireTokenSilent if possible
    // For now, throw an error suggesting to use getValidAccessToken instead
    throw new Error('Refresh token handling is managed internally by MSAL. Use getValidAccessToken() instead.');
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.accessToken) {
      if (this.config.authMethod === 'client_credentials') {
        return await this.getClientCredentialsToken();
      } else {
        throw new Error('No access token available. Please complete OAuth flow.');
      }
    }

    // Check if token is expired or will expire in the next 5 minutes
    if (this.tokenExpiresAt && this.tokenExpiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
      if (this.config.authMethod === 'client_credentials') {
        return await this.getClientCredentialsToken();
      } else {
        await this.refreshAccessToken();
      }
    }

    return this.accessToken;
  }

  /**
   * Send email using Microsoft Graph API
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    body: string,
    isHtml: boolean = true,
    fromEmail: string,
    fromName?: string,
    cc?: string[],
    bcc?: string[],
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>
  ): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken();

      // Prepare recipients
      const toRecipients = Array.isArray(to) ? to : [to];
      const message: any = {
        subject: subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body,
        },
        toRecipients: toRecipients.map((email) => ({
          emailAddress: {
            address: email,
          },
        })),
      };

      // Add CC recipients if provided
      if (cc && cc.length > 0) {
        message.ccRecipients = cc.map((email) => ({
          emailAddress: {
            address: email,
          },
        }));
      }

      // Add BCC recipients if provided
      if (bcc && bcc.length > 0) {
        message.bccRecipients = bcc.map((email) => ({
          emailAddress: {
            address: email,
          },
        }));
      }

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        message.attachments = this.prepareAttachments(attachments);
      }

      const emailData = { message };

      // For client credentials flow, use the fromEmail user's mailbox
      const url = `https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`;

      const response = await axios.post(url, emailData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 202) {
        this.logger.info('Email sent successfully', { to: Array.isArray(to) ? to.join(', ') : to, subject });
        return true;
      }

      throw new Error(`Failed to send email: HTTP ${response.status}`);
    } catch (error: any) {
      this.logger.error('Failed to send email', error as Error, {
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Prepare attachments for Microsoft Graph API
   */
  private prepareAttachments(
    attachments: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>
  ): any[] {
    return attachments.map((attachment) => {
      const content = Buffer.isBuffer(attachment.content)
        ? attachment.content.toString('base64')
        : Buffer.from(attachment.content as string).toString('base64');

      return {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentType: attachment.contentType || 'application/octet-stream',
        contentBytes: content,
      };
    });
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.tenantId &&
      this.config.clientId &&
      this.config.clientSecret
    );
  }

  /**
   * Check if we have valid tokens
   */
  hasValidToken(): boolean {
    return !!(
      this.accessToken &&
      this.tokenExpiresAt &&
      this.tokenExpiresAt.getTime() > Date.now()
    );
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.tokenStorage.clear();
    this.logger.info('OAuth tokens cleared');
  }

  /**
   * Generate random state for OAuth flow
   */
  private generateState(): string {
    return Buffer.from(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)).toString('base64');
  }

  /**
   * Store tokens in memory (in production, use database)
   */
  private storeTokens(): void {
    if (this.accessToken && this.tokenExpiresAt) {
      this.tokenStorage.set('access_token', {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken || undefined,
        expiresAt: this.tokenExpiresAt,
        tokenType: 'Bearer',
        scope: this.config.scope,
      });
    }
  }

  /**
   * Load stored tokens from memory (in production, load from database)
   */
  loadStoredTokens(): void {
    const stored = this.tokenStorage.get('access_token');
    if (stored && stored.expiresAt.getTime() > Date.now()) {
      this.accessToken = stored.accessToken;
      this.refreshToken = stored.refreshToken || null;
      this.tokenExpiresAt = stored.expiresAt;
    }
  }
}

