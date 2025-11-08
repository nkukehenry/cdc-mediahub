import Link from 'next/link';
import { Suspense } from 'react';
import PublicLoginForm from '@/components/PublicLoginForm';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export default function PublicLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNav />

      <div className="flex-1 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto flex flex-col justify-center items-center">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-au-grey-text">Welcome back</h1>
            <p className="mt-3 text-sm text-au-grey-text/70">
              Sign in to continue exploring publications and managing your media.
            </p>
            <p className="mt-6 text-sm text-au-grey-text/80">
              Need an account?{' '}
              <Link href="/register" className="text-au-green hover:text-au-corporate-green font-medium">
                Create one now
              </Link>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl px-6 py-8 md:px-10 w-full md:w-1/2 lg:w-3/5">
            <Suspense fallback={<div className="py-8 text-center text-au-grey-text/70">Loading...</div>}>
              <PublicLoginForm />
            </Suspense>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

