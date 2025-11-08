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
  const isAdminUser = Boolean(user?.isAdmin);
  const shouldGuard = !isLoginPage;

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdminUser && <AdminNav />}
      <main className={isAdminUser ? 'w-[95%] mx-[2.5%] px-4 sm:px-6 lg:px-8 py-8' : ''}>
        {shouldGuard ? <AuthGuard>{children}</AuthGuard> : children}
      </main>
    </div>
  );
}

