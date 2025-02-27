'use client';

import { useEffect, useState } from 'react';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';
import { BoundingBoxGenerator, UserConfig, UserConfigData } from '~shared/user-config/UserConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserConfigModal(props: Props) {
  const [configData, setConfigData] = useState<UserConfigData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [textInputError, setTextInputError] = useState(false);

  const supabase = SupabaseClientForClient.createForClientComponent();

  useEffect(() => {
    if (!props.isOpen) return;

    (async () => {
      const userConfig = await UserConfig.genFetch(props.userId, supabase);
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
      await UserConfig.genUpsert(props.userId, configData, supabase);
      props.onClose();
    } catch (err) {
      ALogger.error((err as Error).message);
    }
  };

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold text-black">Configurations</h2>
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
                className="mt-2 w-full rounded border px-2 py-1 text-sm text-black"
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
                  className={`mt-2 w-full rounded border px-2 py-1 text-sm text-black ${
                    textInputError ? 'border-red-500 bg-red-50' : ''
                  }`}
                  required
                />
              )}
            </div>

            <div className="mb-4">
              <label className="flex items-center justify-between text-gray-700">
                <span>Save and apply cookies</span>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={configData.autoSaveAndApplyCookies}
                    onChange={(e) => handleDataUpdate({ autoSaveAndApplyCookies: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-300"></div>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={props.onClose}
                className="mr-2 rounded border-2 border-blue-500 bg-transparent px-4 py-1 text-blue-500"
              >
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="rounded bg-blue-500 px-4 py-1 text-white">
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
