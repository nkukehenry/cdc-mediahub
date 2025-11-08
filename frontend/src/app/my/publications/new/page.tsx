'use client';

import { useRouter } from 'next/navigation';
import PublicationWizard from '@/components/PublicationWizard';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export default function NewPublicPublicationPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/my/publications');
  };

  const handleCancel = () => {
    router.push('/my/publications');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNav />
      <div className="flex-1">
        <PublicationWizard
          mode="public"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
      <PublicFooter />
    </div>
  );
}
