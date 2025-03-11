import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';
import { UserConfig, UserConfigData } from '~shared/user-config/UserConfig';
import { UserSessionContext } from '~src/contexts/UserSessionContext';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CookieModal({ isOpen, onClose }: CookieModalProps) {
  const [configData, setConfigData] = useState<UserConfigData | undefined>(undefined);
  const [groupedCookies, setGroupedCookies] = useState<Record<string, string[]>>({});

  const { user } = useContext(UserSessionContext);
  const userId = user!.id;

  const supabase = SupabaseClientForClient.createForClientComponent();

  const getEffectiveDomain = (domain: string): string => {
    const cleanDomain = domain.startsWith('.') ? domain.substring(1) : domain;
    const parts = cleanDomain.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : cleanDomain;
  };

  useEffect(() => {
    const fetchData = async () => {
      const [cookiesResult, userConfig] = await Promise.all([
        supabase.from('remote_browser_cookies').select('domain').eq('user_id', userId),
        UserConfig.genFetch(userId, supabase),
      ]);

      if (cookiesResult.error) throw cookiesResult.error;

      const cookiesData = cookiesResult.data.map((d) => ({ domain: d.domain }));

      // Group cookies by effective domain
      const grouped = cookiesData.reduce(
        (acc, cookie) => {
          const effectiveDomain = getEffectiveDomain(cookie.domain);
          if (!acc[effectiveDomain]) acc[effectiveDomain] = [];
          acc[effectiveDomain].push(cookie.domain);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      setGroupedCookies(grouped);
      setConfigData(userConfig);
    };

    fetchData();
  }, []);

  const deleteAllDomainsInGroup = async (effectiveDomain: string) => {
    const domainsToDelete = groupedCookies[effectiveDomain] || [];

    // Delete all domains in the group with a single batch operation
    await Promise.all(
      domainsToDelete.map((domain) =>
        supabase.from('remote_browser_cookies').delete().eq('domain', domain).eq('user_id', userId),
      ),
    );

    setGroupedCookies((prev) => {
      const updated = { ...prev };
      delete updated[effectiveDomain];
      return updated;
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded bg-white p-6">
          <DialogTitle className="mb-6 text-center text-xl font-medium text-gray-500">Cookies</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center space-x-2">
              <span className="text-gray-500">Automatically save &amp; apply cookies</span>
              <Tooltip
                placement="bottom"
                arrow
                title={<p className="text-xs">This setting can be changed in 'User Configurations'</p>}
                enterDelay={300}
              >
                {configData?.autoSaveAndApplyCookies ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-500" />
                )}
              </Tooltip>
            </div>
            <hr className="my-4" />
            {Object.keys(groupedCookies).length === 0 ? (
              <div className="text-gray-500">No saved cookies</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {Object.entries(groupedCookies).map(([effectiveDomain, domains]) => (
                  <li key={effectiveDomain} className="flex items-center justify-between rounded bg-gray-100 p-3">
                    <span className="font-medium text-black">{effectiveDomain}</span>
                    <button
                      onClick={() => deleteAllDomainsInGroup(effectiveDomain)}
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
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
