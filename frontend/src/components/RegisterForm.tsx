'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess } from '@/utils/errorHandler';

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, options: any) => number;
      reset: (widgetId?: number) => void;
      ready: (callback: () => void) => void;
    };
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);

  const resetRecaptcha = useCallback(() => {
    if (RECAPTCHA_SITE_KEY && typeof window !== 'undefined' && window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
      window.grecaptcha.reset(recaptchaWidgetIdRef.current);
      setCaptchaToken(null);
    }
  }, []);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || typeof window === 'undefined') {
      return;
    }

    const renderRecaptcha = () => {
      if (!window.grecaptcha || typeof window.grecaptcha.render !== 'function' || !recaptchaContainerRef.current || recaptchaWidgetIdRef.current !== null) {
        return;
      }

      recaptchaWidgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null),
        'error-callback': () => setCaptchaToken(null),
      });
    };

    if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      window.grecaptcha.ready(renderRecaptcha);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-recaptcha-api="true"]');
    if (existingScript) {
      if (existingScript.getAttribute('data-loaded') === 'true') {
        window.grecaptcha?.ready(renderRecaptcha);
      } else {
        const handleLoad = () => {
          existingScript.setAttribute('data-loaded', 'true');
          window.grecaptcha?.ready(renderRecaptcha);
        };
        existingScript.addEventListener('load', handleLoad, { once: true });
        return () => existingScript.removeEventListener('load', handleLoad);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaApi = 'true';
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      window.grecaptcha?.ready(renderRecaptcha);
    };
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      showError('Email and password are required.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Password confirmation does not match.');
      return;
    }

    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      showError('Please complete the reCAPTCHA challenge.');
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      email: email.trim(),
      password,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      recaptchaToken: captchaToken || undefined,
    });

    setIsSubmitting(false);
    resetRecaptcha();

    if (result.success) {
      showSuccess('Account created successfully.');
      router.push('/');
    } else {
      showError(result.error || 'Registration failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-au-grey-text mb-2">
            First Name (optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-au-grey-text/50" />
            </div>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-au-green focus:border-au-green"
              placeholder="First name"
            />
          </div>
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-au-grey-text mb-2">
            Last Name (optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-au-grey-text/50" />
            </div>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-au-green focus:border-au-green"
              placeholder="Last name"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-au-grey-text mb-2">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-au-grey-text/50" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-au-green focus:border-au-green"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-au-grey-text mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-au-grey-text/50" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-au-green focus:border-au-green"
              placeholder="Create a password"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-au-grey-text mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-au-grey-text/50" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-au-green focus:border-au-green"
              placeholder="Confirm your password"
            />
          </div>
        </div>
      </div>

      {RECAPTCHA_SITE_KEY && (
        <div className="flex justify-center">
          <div ref={recaptchaContainerRef} />
        </div>
      )}

      <div className="flex justify-center mt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full lg:w-1/2 xl:w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-au-white bg-au-green hover:bg-au-corporate-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-au-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </div>
    </form>
  );
}

