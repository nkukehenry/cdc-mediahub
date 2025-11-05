'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import LoginForm from '@/components/LoginForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import DashboardContent from '@/components/DashboardContent';
import { Provider } from 'react-redux';
import { store } from '@/store';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-au-grey-text">{t('auth.adminLogin')}</h2>
            <p className="mt-2 text-sm text-au-grey-text/70">
              {t('auth.signInToAccess')}
            </p>
          </div>
          <LoginForm />
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

