import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import nodemailer from 'nodemailer';
import { ExchangeOAuth, ExchangeOAuthConfig } from './ExchangeOAuth';

export interface EmailConfig {
  enabled: boolean;
  provider: 'microsoft-graph' | 'smtp';
  // Microsoft Graph API config
  graphClientId?: string;
  graphClientSecret?: string;
  graphTenantId?: string;
  // SMTP config (for Exchange Online or other SMTP)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  // Email settings
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<boolean>;
  sendPasswordResetEmail(to: string, username: string, tempPassword: string): Promise<boolean>;
  sendWelcomeEmail(to: string, username: string, password?: string): Promise<boolean>;
  sendAccountBlockedEmail(to: string, username: string): Promise<boolean>;
  sendAccountUnblockedEmail(to: string, username: string): Promise<boolean>;
  sendPasswordChangedEmail(to: string, username: string): Promise<boolean>;
}

export class EmailService implements IEmailService {
  private logger = getLogger('EmailService');
  private errorHandler = getErrorHandler();
  private config: EmailConfig;
  private transporter: nodemailer.Transporter | null = null;
  private exchangeOAuth: ExchangeOAuth | null = null;
  private initialized: boolean = false;

  constructor(config: EmailConfig) {
    this.config = config;
    // Initialize asynchronously without blocking
    this.initialize().catch((error) => {
      this.logger.error('Email service initialization failed', error as Error);
    });
  }

  private async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Email service is disabled');
      this.initialized = true;
      return;
    }

    try {
      // Log available environment variables for debugging (without exposing secrets)
      const envVars = {
        EMAIL_ENABLED: process.env.EMAIL_ENABLED,
        EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
        hasEXCHANGE_EMAIL_CLIENT_ID: !!process.env.EXCHANGE_EMAIL_CLIENT_ID,
        hasMICROSOFT_GRAPH_CLIENT_ID: !!process.env.MICROSOFT_GRAPH_CLIENT_ID,
        hasMS_GRAPH_CLIENT_ID: !!process.env.MS_GRAPH_CLIENT_ID,
        hasGRAPH_CLIENT_ID: !!process.env.GRAPH_CLIENT_ID,
        hasAZURE_CLIENT_ID: !!process.env.AZURE_CLIENT_ID,
        hasEXCHANGE_EMAIL_CLIENT_SECRET: !!process.env.EXCHANGE_EMAIL_CLIENT_SECRET,
        hasMICROSOFT_GRAPH_CLIENT_SECRET: !!process.env.MICROSOFT_GRAPH_CLIENT_SECRET,
        hasEXCHANGE_EMAIL_TENANT_ID: !!process.env.EXCHANGE_EMAIL_TENANT_ID,
        hasMICROSOFT_GRAPH_TENANT_ID: !!process.env.MICROSOFT_GRAPH_TENANT_ID,
      };
      
      this.logger.info('Initializing email service', { 
        provider: this.config.provider,
        enabled: this.config.enabled,
        hasGraphConfig: !!(this.config.graphClientId && this.config.graphClientSecret && this.config.graphTenantId),
        hasSMTPConfig: !!(this.config.smtpHost && this.config.smtpUser && this.config.smtpPassword),
        envVars
      });

      if (this.config.provider === 'microsoft-graph') {
        // Try Microsoft Graph API first if credentials are available
        if (this.config.graphClientId && this.config.graphClientSecret && this.config.graphTenantId) {
          await this.initializeMicrosoftGraph();
        } else if (this.config.smtpHost && this.config.smtpUser && this.config.smtpPassword) {
          // Fallback to SMTP if Graph API credentials are not available
          this.logger.warn('EMAIL_PROVIDER is set to microsoft-graph but Graph API credentials are missing. Falling back to SMTP.');
          await this.initializeSMTP();
        } else {
          throw new Error('Microsoft Graph provider requires either Graph API credentials (EXCHANGE_EMAIL_CLIENT_ID, EXCHANGE_EMAIL_CLIENT_SECRET, EXCHANGE_EMAIL_TENANT_ID) or SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
        }
      } else {
        // Provider is 'smtp' or not set
        if (this.config.provider !== 'smtp' && 
            this.config.graphClientId && this.config.graphClientSecret && this.config.graphTenantId) {
          // If provider is not explicitly set, but we have Graph config, use Graph
          this.logger.warn('Provider not explicitly set to microsoft-graph, but Graph config found. Using Microsoft Graph.');
          await this.initializeMicrosoftGraph();
        } else {
          await this.initializeSMTP();
        }
      }
      this.initialized = true;
      this.logger.info('Email service initialized successfully', { provider: this.config.provider });
    } catch (error) {
      this.logger.error('Failed to initialize email service', error as Error);
      this.initialized = false;
      // Don't throw - allow app to continue without email
    }
  }

  private async initializeMicrosoftGraph(): Promise<void> {
    // Microsoft Graph API with OAuth 2.0
    this.logger.info('Checking Microsoft Graph configuration', {
      hasClientId: !!this.config.graphClientId,
      hasClientSecret: !!this.config.graphClientSecret,
      hasTenantId: !!this.config.graphTenantId,
      clientIdLength: this.config.graphClientId?.length || 0,
      clientSecretLength: this.config.graphClientSecret?.length || 0,
      tenantIdLength: this.config.graphTenantId?.length || 0
    });

    if (!this.config.graphClientId || !this.config.graphClientSecret || !this.config.graphTenantId) {
      const missing = [];
      if (!this.config.graphClientId) missing.push('CLIENT_ID');
      if (!this.config.graphClientSecret) missing.push('CLIENT_SECRET');
      if (!this.config.graphTenantId) missing.push('TENANT_ID');
      
      throw new Error(`Microsoft Graph configuration incomplete. Missing: ${missing.join(', ')}. Please set one of: EXCHANGE_EMAIL_${missing[0]}, MICROSOFT_GRAPH_${missing[0]}, or GRAPH_${missing[0]} (and corresponding values for all three)`);
    }

    const oauthConfig: ExchangeOAuthConfig = {
      tenantId: this.config.graphTenantId,
      clientId: this.config.graphClientId,
      clientSecret: this.config.graphClientSecret,
      authMethod: 'client_credentials', // Use client credentials flow for server-to-server
      scope: 'https://graph.microsoft.com/.default',
    };

    this.exchangeOAuth = new ExchangeOAuth(oauthConfig);

    if (!this.exchangeOAuth.isConfigured()) {
      throw new Error('Microsoft Graph OAuth is not properly configured');
    }

    // Try to get an initial token to verify configuration
    try {
      await this.exchangeOAuth.getClientCredentialsToken();
      this.logger.info('Microsoft Graph OAuth initialized successfully');
    } catch (error) {
      this.logger.error('Failed to obtain initial Microsoft Graph token', error as Error);
      // Don't throw - token will be obtained on first email send
    }
  }

  private async initializeSMTP(): Promise<void> {
    if (!this.config.smtpHost || !this.config.smtpUser || !this.config.smtpPassword) {
      throw new Error('SMTP configuration required. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables.');
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort || 587,
      secure: this.config.smtpSecure ?? false,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
      },
    });

    // Verify connection
    try {
      await this.transporter.verify();
      this.logger.info('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('SMTP connection verification failed', error as Error);
      throw error;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.config.enabled) {
      this.logger.warn('Email service is disabled, skipping email send');
      return false;
    }

    // Wait for initialization if not yet complete
    if (!this.initialized) {
      this.logger.warn('Email service not yet initialized, attempting initialization', {
        provider: this.config.provider,
        enabled: this.config.enabled
      });
      try {
        await this.initialize();
        // Wait a bit more for async initialization to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error('Failed to initialize email service during send', error as Error);
        return false;
      }
    }

    try {
      // Determine which method to use based on what's initialized
      // Priority: Graph API if available, otherwise SMTP
      if (this.exchangeOAuth && this.exchangeOAuth.isConfigured()) {
        // Use Microsoft Graph API
        return await this.sendEmailViaGraph(options);
      } else if (this.transporter) {
        // Use SMTP (can be Exchange Online SMTP when provider is microsoft-graph)
        return await this.sendEmailViaSMTP(options);
      } else {
        this.logger.error('Email service not properly initialized', new Error('Email service not initialized'), {
          provider: this.config.provider,
          hasExchangeOAuth: !!this.exchangeOAuth,
          hasTransporter: !!this.transporter,
          initialized: this.initialized
        });
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to send email', error as Error, { 
        to: options.to, 
        subject: options.subject 
      });
      return false;
    }
  }

  private async sendEmailViaGraph(options: EmailOptions): Promise<boolean> {
    if (!this.exchangeOAuth) {
      throw new Error('Microsoft Graph OAuth not initialized');
    }

    // Prepare attachments for Graph API
    const attachments = options.attachments?.map((att) => {
      let content: Buffer;
      if (att.content) {
        content = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
      } else if (att.path) {
        const fs = require('fs');
        content = fs.readFileSync(att.path);
      } else {
        throw new Error('Attachment must have content or path');
      }

      return {
        filename: att.filename,
        content: content,
        contentType: att.contentType || 'application/octet-stream',
      };
    });

    const to = Array.isArray(options.to) ? options.to : [options.to];
    const cc = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined;
    const bcc = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined;

    const result = await this.exchangeOAuth.sendEmail(
      to,
      options.subject,
      options.html,
      true, // isHtml
      this.config.fromEmail,
      this.config.fromName,
      cc,
      bcc,
      attachments
    );

    if (result) {
      this.logger.info('Email sent successfully via Microsoft Graph API', { 
        to: options.to, 
        subject: options.subject 
      });
    }

    return result;
  }

  private async sendEmailViaSMTP(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions = {
      from: this.config.fromName 
        ? `${this.config.fromName} <${this.config.fromEmail}>`
        : this.config.fromEmail,
      replyTo: this.config.replyTo || this.config.fromEmail,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      subject: options.subject,
      text: options.text || this.htmlToText(options.html),
      html: options.html,
      attachments: options.attachments,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.info('Email sent successfully via SMTP', { 
      to: options.to, 
      subject: options.subject,
      messageId: info.messageId 
    });
    return true;
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  async sendPasswordResetEmail(to: string, username: string, tempPassword: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .password-box { background-color: #fff; border: 2px solid #0066cc; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; font-family: monospace; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Your password has been reset. Please use the following temporary password to log in:</p>
            <div class="password-box">
              ${tempPassword}
            </div>
            <p><strong>Important:</strong> Please change this password immediately after logging in for security purposes.</p>
            <p>If you did not request this password reset, please contact support immediately.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Password Reset - Temporary Password',
      html,
    });
  }

  async sendWelcomeEmail(to: string, username: string, password?: string): Promise<boolean> {
    const passwordSection = password 
      ? `
        <p>Your account has been created with the following credentials:</p>
        <div class="password-box">
          Username: ${username}<br>
          Password: ${password}
        </div>
        <p><strong>Important:</strong> Please change this password after your first login for security purposes.</p>
      `
      : `
        <p>Your account has been created. You can now log in using your username: <strong>${username}</strong></p>
      `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .password-box { background-color: #fff; border: 2px solid #0066cc; padding: 15px; margin: 20px 0; text-align: center; font-size: 16px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome!</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Welcome to our platform! Your account has been successfully created.</p>
            ${passwordSection}
            <p>We're excited to have you on board!</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome - Account Created',
      html,
    });
  }

  async sendAccountBlockedEmail(to: string, username: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Blocked</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Your account has been temporarily blocked by an administrator.</p>
            <p>If you believe this is an error, please contact support to resolve this issue.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Account Blocked',
      html,
    });
  }

  async sendAccountUnblockedEmail(to: string, username: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Unblocked</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Good news! Your account has been unblocked and you can now access the platform again.</p>
            <p>You can log in using your usual credentials.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Account Unblocked',
      html,
    });
  }

  async sendPasswordChangedEmail(to: string, username: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Your password has been successfully changed.</p>
            <p>If you did not make this change, please contact support immediately.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Password Changed',
      html,
    });
  }
}

