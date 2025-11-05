'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-au-grey-text mb-6">{t('nav.settings')}</h1>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-au-grey-text/70">{t('nav.settings')} page coming soon...</p>
        </div>
      </div>
    </div>
  );
}

