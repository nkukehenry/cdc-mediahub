'use client';

import { useRouter, useParams } from 'next/navigation';
import PublicationWizard from '@/components/PublicationWizard';

export default function EditPublicationPage() {
  const router = useRouter();
  const params = useParams();
  const publicationId = params?.id as string;

  const handleSuccess = () => {
    router.push('/admin/publications');
  };

  const handleCancel = () => {
    router.push('/admin/publications');
  };

  if (!publicationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Invalid publication ID</div>
      </div>
    );
  }

  return (
    <PublicationWizard 
      publicationId={publicationId}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      mode="admin"
    />
  );
}

