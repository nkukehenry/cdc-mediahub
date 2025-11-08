import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import RegisterForm from '@/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNav />

      <div className="flex-1 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-au-grey-text">Create your account</h1>
            <p className="mt-3 text-sm text-au-grey-text/70">
              Join the Media Hub community to access publications and manage your content.
            </p>
            <p className="mt-6 text-sm text-au-grey-text/80">
              Already have an account?{' '}
              <Link href="/login" className="text-au-green hover:text-au-corporate-green font-medium">
                Sign in instead
              </Link>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl px-6 py-8 md:px-10">
            <RegisterForm />
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

