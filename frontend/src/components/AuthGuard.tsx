'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { showError } from '@/utils/errorHandler';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isRedirectingRef = useRef(false);
  const hasShownWarningRef = useRef(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      if (!isRedirectingRef.current) {
        const redirectPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname;
        router.replace(`/admin?redirect=${encodeURIComponent(redirectPath || '')}`);
        isRedirectingRef.current = true;
      }
      return;
    }

    if (!user.isAdmin) {
      if (!hasShownWarningRef.current) {
        showError('You do not have access to the admin area.');
        hasShownWarningRef.current = true;
      }

      if (!isRedirectingRef.current) {
        router.replace('/');
        isRedirectingRef.current = true;
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

