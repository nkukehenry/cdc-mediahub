'use client';

import { ReactNode } from 'react';
import PublicSidebar from './PublicSidebar';
import PublicTopNav from './PublicTopNav';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Left Sidebar */}
      <PublicSidebar />
      
      {/* Main Content Area (offset for sidebar) */}
      <div className="ml-64">
        {/* Fixed Top Navigation */}
        <PublicTopNav />
        
        {/* Scrollable Main Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

