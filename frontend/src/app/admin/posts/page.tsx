'use client';

import { Suspense } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useSearchParams } from 'next/navigation';

function PostsPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  const getTitle = () => {
    if (status === 'pending') return t('nav.pendingPublications');
    if (status === 'draft') return t('nav.draftPublications');
    if (status === 'rejected') return t('nav.rejectedPublications');
    return t('nav.allPublications');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-au-grey-text mb-6">{getTitle()}</h1>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-au-grey-text/70">{t('nav.publications')} page coming soon...</p>
          {status && (
            <p className="text-sm text-au-grey-text/50 mt-2">
              Filter: {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <PostsPageContent />
    </Suspense>
  );
}

