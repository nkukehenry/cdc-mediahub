import axios from 'axios';
import { ConfigurationService } from './ConfigurationService';
import { getLogger } from '../utils/Logger';

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export class RecaptchaService {
  private readonly logger = getLogger('RecaptchaService');
  private readonly secret?: string;

  constructor(configurationService: ConfigurationService) {
    this.secret = configurationService.getRecaptchaSecret();
  }

  isEnabled(): boolean {
    return Boolean(this.secret);
  }

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    if (!this.isEnabled()) {
      // If no secret is configured, treat verification as optional and allow the request.
      return true;
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', this.secret!);
      params.append('response', token);
      if (remoteIp) {
        params.append('remoteip', remoteIp);
      }

      const response = await axios.post(RECAPTCHA_VERIFY_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data?.success) {
        return true;
      }

      this.logger.warn('reCAPTCHA verification failed', {
        errors: response.data?.['error-codes'] || [],
      });
      return false;
    } catch (error) {
      this.logger.error('reCAPTCHA verification error', error as Error);
      throw error;
    }
  }
}
