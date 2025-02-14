import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CookieModal({ isOpen, onClose }: CookieModalProps) {
  const [autoSave, setAutoSave] = useState(false);
  const [cookies, setCookies] = useState<{ website: string }[]>([]);

  const deleteCookie = (website: string) => {
    setCookies((prev) => prev.filter((c) => c.website !== website));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto rounded bg-white p-6">
          <DialogTitle className="mb-6 text-center text-xl font-medium text-gray-500">Cookies</DialogTitle>
          <div className="flex flex-col gap-4">
            <label className="inline-flex items-center space-x-2">
              <span className="text-gray-500">Automatically save &amp; apply cookies</span>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="form-checkbox"
              />
            </label>
            <hr className="my-4" />
            {cookies.length === 0 ? (
              <div className="text-gray-500">No saved cookies</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {cookies.map((cookie) => (
                  <li key={cookie.website} className="flex items-center justify-between rounded bg-gray-100 p-2">
                    <span className="text-black">{cookie.website}</span>
                    <button
                      onClick={() => deleteCookie(cookie.website)}
                      className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300">
              Close
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
