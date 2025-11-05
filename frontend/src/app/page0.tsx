'use client';

import PublicNav from '@/components/PublicNav';
import SearchBar from '@/components/SearchBar';
import UnifiedSlider from '@/components/UnifiedSlider';
import CategoriesSection from '@/components/CategoriesSection';
import LatestPublications from '@/components/LatestPublications';
import { Provider } from 'react-redux';
import { store } from '@/store';

export default function Home0() {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-50">
        <PublicNav />
        
        {/* Search Section */}
        <div className="bg-white border-b border-gray-200 py-6 px-12 md:px-16 lg:px-24 xl:px-32">
          <div className="container mx-auto">
            <SearchBar />
          </div>
        </div>

        {/* Unified 3D Slider */}
        <div className="py-8 px-12 md:px-16 lg:px-24 xl:px-32">
          <div className="container mx-auto">
            <UnifiedSlider limit={20} />
          </div>
        </div>

        {/* Categories Section */}
        <CategoriesSection />

        {/* Latest Publications Section */}
        <LatestPublications />
      </div>
    </Provider>
  );
}
