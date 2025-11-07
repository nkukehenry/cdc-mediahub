'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { RootState } from '@/store';
import { fetchLatestPublications } from '@/store/publicationsSlice';
import PublicationCard from './PublicationCard';

export default function LatestPublications() {
  const dispatch = useDispatch();
  const { latestPublications, loading } = useSelector((state: RootState) => state.publications);

  useEffect(() => {
    dispatch(fetchLatestPublications(12) as any);
  }, [dispatch]);

  if (loading) {
    return (
      <div className="bg-white py-8 px-12 md:px-16 lg:px-24 xl:px-32">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gray-200 overflow-hidden animate-pulse aspect-[2/1]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (latestPublications.length === 0) {
    return null;
  }

  return (
    <div className="bg-white py-8 px-12 md:px-16 lg:px-24 xl:px-32">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b-2 border-au-red pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-au-red">
            LATEST PUBLICATIONS
          </h2>
          <Link
            href="/publications"
            className="text-au-grey-text/70 hover:text-au-gold transition-all duration-300 text-sm font-medium flex items-center gap-1 group"
          >
            View All Publications <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        {/* Publications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mb-8">
          {latestPublications.slice(0, 12).map((publication, index) => (
            <div
              key={publication.id}
              className="animate-fade-in"
              style={{
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <PublicationCard publication={publication} />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link
            href="/publications"
            className="inline-block bg-au-corporate-green hover:bg-au-corporate-green/90 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 uppercase shadow-md hover:shadow-lg"
          >
            VIEW ALL PUBLICATIONS
          </Link>
        </div>
      </div>
    </div>
  );
}

