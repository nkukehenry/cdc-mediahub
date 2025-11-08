'use client';

import { useParams, useRouter } from 'next/navigation';
import PublicationWizard from '@/components/PublicationWizard';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export default function EditPublicPublicationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const publicationId = params?.id;

  if (!publicationId) {
    router.replace('/my/publications');
    return null;
  }

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
          publicationId={publicationId}
          mode="public"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
      <PublicFooter />
    </div>
  );
}
