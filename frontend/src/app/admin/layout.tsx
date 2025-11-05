'use client';

import { usePathname } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLoginPage = pathname === '/admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <AdminNav />}
      <main className={user ? 'w-[95%] mx-[2.5%] px-4 sm:px-6 lg:px-8 py-8' : ''}>
        {user ? <AuthGuard>{children}</AuthGuard> : children}
      </main>
    </div>
  );
}

