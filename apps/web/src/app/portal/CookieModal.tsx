import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { isStringConfigOn } from '~shared/env/environment';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';
import { UserSessionContext } from '~src/contexts/UserSessionContext';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CookieModal({ isOpen, onClose }: CookieModalProps) {
  const [cookies, setCookies] = useState<{ domain: string }[]>([]);
  const { user } = useContext(UserSessionContext);

  const supabase = SupabaseClientForClient.createForClientComponent();

  useEffect(() => {
    const fetchCookies = async () => {
      const { data, error } = await supabase.from('remote_browser_cookies').select('domain').eq('user_id', user!.id);
      if (error) throw error;
      setCookies(data.map((d) => ({ domain: d.domain })));
    };
    fetchCookies();
  }, []);

  const deleteCookie = async (domain: string) => {
    const { error } = await supabase
      .from('remote_browser_cookies')
      .delete()
      .eq('domain', domain)
      .eq('user_id', user!.id);
    if (error) throw error;
    setCookies((prev) => prev.filter((c) => c.domain !== domain));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto rounded bg-white p-6">
          <DialogTitle className="mb-6 text-center text-xl font-medium text-gray-500">Cookies</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center space-x-2">
              <span className="text-gray-500">Automatically save &amp; apply cookies</span>
              <Tooltip
                placement="bottom"
                arrow
                title={<p className="text-xs">This setting is controlled by NEXT_PUBLIC_AUTO_SAVE_COOKIES in env</p>}
                enterDelay={300}
              >
                {isStringConfigOn(process.env.NEXT_PUBLIC_AUTO_SAVE_COOKIES) ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-500" />
                )}
              </Tooltip>
            </div>
            <hr className="my-4" />
            {cookies.length === 0 ? (
              <div className="text-gray-500">No saved cookies</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {cookies.map((cookie) => (
                  <li key={cookie.domain} className="flex items-center justify-between rounded bg-gray-100 p-2">
                    <span className="text-black">{cookie.domain}</span>
                    <button
                      onClick={() => deleteCookie(cookie.domain)}
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
