'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSopStore } from '~src/store/sopStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SOPModal(props: Props) {
  if (!props.isOpen) return null;

  const { sops, isLoading, error, fetchSops } = useSopStore();

  useEffect(() => {
    if (sops.length === 0) {
      fetchSops();
    }
  }, []);

  const renderContent = () => {
    if (isLoading) return <label className="block text-black">Loading SOPs...</label>;
    if (error) return <label className="block text-black">Error loading SOPs</label>;
    if (sops.length === 0) return <label className="block text-black">No SOPs found</label>;
    return (
      <section className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto px-2">
        {sops.map((sop) => (
          <Link key={sop.id} href={`/portal?sopId=${sop.id}`} onClick={props.onClose}>
            <div className="cursor-pointer rounded bg-gray-600 p-4 text-white shadow transition-all duration-200 hover:bg-gray-500">
              <h2 className="mb-2 text-xl font-semibold">{sop.name}</h2>
              <p>{sop.description}</p>
            </div>
          </Link>
        ))}
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold text-black">SOPs</h2>
        {renderContent()}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={props.onClose}
            className="mr-2 rounded border-2 border-blue-500 bg-transparent px-4 py-1 text-blue-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
