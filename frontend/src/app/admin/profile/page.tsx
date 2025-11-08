import ProfileSettings from '@/components/ProfileSettings';

export default function AdminProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <ProfileSettings heading="Profile Settings" />
      </div>
    </div>
  );
}

