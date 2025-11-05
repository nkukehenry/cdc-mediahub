'use client';

import { useRouter } from 'next/navigation';
import PublicationWizard from '@/components/PublicationWizard';

export default function NewPublicationPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/admin/publications');
  };

  const handleCancel = () => {
    router.push('/admin/publications');
  };

  return (
    <PublicationWizard 
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      mode="admin"
    />
  );
}

