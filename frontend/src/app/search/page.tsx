'use client';

import { Suspense } from 'react';
import { Provider } from 'react-redux';

import { store } from '@/store';
import PublicationsExplorer from '@/components/publications/PublicationsExplorer';

export default function SearchPage() {
  return (
    <Provider store={store}>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-au-gold border-t-transparent rounded-full animate-spin" /></div>}>
        <PublicationsExplorer
          basePath="/search"
          searchParamKeys={['q', 'search']}
          pageTitle="Search Results"
        />
      </Suspense>
    </Provider>
  );
}

