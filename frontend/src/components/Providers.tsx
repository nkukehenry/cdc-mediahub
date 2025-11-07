'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { AuthProvider } from '@/hooks/useAuth';
import ToastProvider from '@/components/ToastProvider';
import SiteMetadata from '@/components/SiteMetadata';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SiteMetadata />
        {children}
        <ToastProvider />
      </AuthProvider>
    </Provider>
  );
}

