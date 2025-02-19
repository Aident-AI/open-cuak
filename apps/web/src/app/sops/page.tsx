'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { MeshBackgroundWithUserSession } from '~src/components/MeshBackgroundWithUserSession';
import { InteractionEventProvider } from '~src/contexts/InteractionEventContext';
import { useSopStore } from '~src/store/sopStore';

export default function MarketplacePage() {
  const { sops, isLoading, error, fetchSops } = useSopStore();

  useEffect(() => {
    if (sops.length === 0) {
      fetchSops();
    }
  }, []);

  return (
    <InteractionEventProvider>
      <MeshBackgroundWithUserSession navigationTargetPath="/home" navigationTitle="Home">
        <div className="relative mx-auto min-h-screen max-w-7xl">
          <header className="absolute left-1/2 top-4 z-10 -translate-x-1/2 transform">
            <h1 className="py-4 text-4xl text-white">SOPs</h1>
          </header>
          {isLoading && <div className="pt-32 text-center text-2xl text-white">Loading...</div>}
          {error && <div className="pt-32 text-center text-2xl text-white">Error loading SOPs</div>}
          {!isLoading &&
            !error &&
            (sops.length > 0 ? (
              <section className="grid grid-cols-1 gap-4 px-2 pt-32 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {sops.map((sop) => (
                  <Link key={sop.id} href={`/portal?sopId=${sop.id}`}>
                    <div className="cursor-pointer rounded bg-gray-600 p-4 text-white shadow transition-all duration-200 hover:bg-gray-500">
                      <h2 className="mb-2 text-xl font-semibold">{sop.name}</h2>
                      <p>{sop.description}</p>
                    </div>
                  </Link>
                ))}
              </section>
            ) : (
              <div className="pt-32 text-center text-2xl text-white">There are not any SOPs</div>
            ))}
        </div>
      </MeshBackgroundWithUserSession>
    </InteractionEventProvider>
  );
}
