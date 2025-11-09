'use client';

import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import SearchBar from '@/components/SearchBar';
import FeaturedSlider from '@/components/FeaturedSlider';
import LeadershipSlider from '@/components/LeadershipSlider';
import CategoriesSection from '@/components/CategoriesSection';
import LatestPublications from '@/components/LatestPublications';
import YouTubeLiveEvents from '@/components/YouTubeLiveEvents';
import { Provider } from 'react-redux';
import { store, RootState } from '@/store';
import { useSelector } from 'react-redux';

function HomeContent() {
  const showLiveEventsOnHome = useSelector(
    (state: RootState) => Boolean(state.settings.settings?.showLiveEventsOnHome)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      
      {/* Search Section */}
      <div className="bg-white border-b border-gray-200 py-6 px-6 md:px-16 lg:px-24 xl:px-32">
        <div className="container mx-auto">
          <SearchBar />
        </div>
      </div>

      {/* Featured and Leadership Sliders */}
      <div className="py-8 px-4 md:px-16 lg:px-24 xl:px-32">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Featured Slider */}
            <div className="w-full">
              <FeaturedSlider limit={10} />
            </div>
            {/* Leadership Slider */}
            <div className="w-full">
              <LeadershipSlider limit={10} />
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <CategoriesSection />

      {/* Latest Publications Section */}
      <LatestPublications />

      {/* YouTube Live Events Section */}
      {showLiveEventsOnHome && <YouTubeLiveEvents limit={6} showViewAll={true} />}

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}

export default function Home() {
  return (
    <Provider store={store}>
      <HomeContent />
    </Provider>
  );
}
