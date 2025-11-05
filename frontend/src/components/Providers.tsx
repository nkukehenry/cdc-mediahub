'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import ToastProvider from '@/components/ToastProvider';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ToastProvider />
    </AuthProvider>
  );
}

