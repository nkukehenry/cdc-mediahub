'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import LoadingSpinner from '@/components/LoadingSpinner';
import DashboardContent from '@/components/DashboardContent';
import { Provider } from 'react-redux';
import { store } from '@/store';

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/admin');
    }
  }, [loading, user, router]);

  if (!user) {
    return null;
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center bg-white shadow-lg rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-au-grey-text">No Admin Access</h2>
          <p className="text-sm text-au-grey-text/70">
            You are signed in as <strong>{user.email}</strong>, but this account does not have permission to access the admin dashboard.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => logout()}
              className="w-full py-2 rounded-lg bg-au-green text-white font-medium hover:bg-au-corporate-green transition-colors"
            >
              Sign in with a different account
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="w-full py-2 rounded-lg border border-au-green text-au-green font-medium hover:bg-au-green/5 transition-colors"
            >
              Go to homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard with analytics
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
          <h1 className="text-xl md:text-2xl font-semibold text-au-grey-text mb-4 md:mb-6">{t('brand.name')} {t('admin.dashboard')}</h1>
          <DashboardContent />
        </div>
      </div>
    </Provider>
  );
}

