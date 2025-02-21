'use client';

import { useEffect, useState } from 'react';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';
import {
  BoundingBoxGenerator,
  UserConfig,
  genFetchUserConfig,
  genSaveUserConfig,
} from '~shared/user-config/UserConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserConfigModal(props: Props) {
  const [configData, setConfigData] = useState<UserConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [textInputError, setTextInputError] = useState(false);

  const supabase = SupabaseClientForClient.createForClientComponent();

  useEffect(() => {
    if (!props.isOpen) return;

    (async () => {
      const userConfig = await genFetchUserConfig(props.userId, supabase);
      setConfigData(userConfig);
      setIsLoading(false);
    })();
  }, [props.isOpen, props.userId]);

  const handleDataUpdate = async (newValue: object) => {
    if (!configData) throw new Error('configData should be initialized');
    const newData = {
      ...configData,
      ...newValue,
    };
    setConfigData(newData);
  };

  const handleSave = async () => {
    if (!configData) throw new Error('configData should be initialized');
    if (configData.boundingBoxGenerator === BoundingBoxGenerator.OMNI_PARSER && !configData.omniparserHost?.trim()) {
      setTextInputError(true);
      return;
    }
    setTextInputError(false);
    try {
      await genSaveUserConfig(props.userId, configData, supabase);
      props.onClose();
    } catch (err) {
      ALogger.error((err as Error).message);
    }
  };

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold text-black">User Configurations</h2>
        {isLoading || !configData ? (
          <div className="flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        ) : (
          <form>
            <div className="mb-4">
              <label className="block text-gray-700">Bounding Box Generator:</label>
              <select
                value={configData.boundingBoxGenerator}
                onChange={(e) => handleDataUpdate({ boundingBoxGenerator: e.target.value as BoundingBoxGenerator })}
                className="w-full rounded border px-3 py-2 text-black"
              >
                {Object.values(BoundingBoxGenerator).map((generator) => (
                  <option key={generator} value={generator}>
                    {generator}
                  </option>
                ))}
              </select>
              {configData.boundingBoxGenerator === BoundingBoxGenerator.OMNI_PARSER && (
                <input
                  type="text"
                  placeholder="Enter OmniParser Host"
                  value={configData.omniparserHost || ''}
                  onChange={(e) => {
                    setTextInputError(false);
                    handleDataUpdate({ omniparserHost: e.target.value.trim() });
                  }}
                  className={`mt-2 w-full rounded border px-3 py-2 text-black ${
                    textInputError ? 'border-red-500 bg-red-50' : ''
                  }`}
                  required
                />
              )}
            </div>

            <div className="mb-4">
              <label className="flex items-center text-gray-700">
                <input
                  type="checkbox"
                  checked={configData.autoSaveAndApplyCookies}
                  onChange={(e) => handleDataUpdate({ autoSaveAndApplyCookies: e.target.checked })}
                  className="mr-2"
                />
                Save and apply cookies
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={props.onClose}
                className="mr-2 rounded border-2 border-blue-500 bg-transparent px-4 py-2 text-blue-500"
              >
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="rounded bg-blue-500 px-4 py-2 text-white">
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
