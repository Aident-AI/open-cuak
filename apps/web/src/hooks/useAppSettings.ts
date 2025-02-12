'use client';

import { useEffect, useState } from 'react';
import { AppSetting, AppSettings, AppSettingsSchema } from '~shared/app-settings/types';
import { BroadcastEventType } from '~shared/broadcast/types';
import { useBroadcastService } from '~src/hooks/useBroadcastService';

export function useAppSettings(key?: AppSetting) {
  const [allSettings, setAllSettings] = useState<AppSettings>(AppSettingsSchema.parse({}));
  const { fetch, subscribe, send } = useBroadcastService();

  useEffect(() => {
    const exec = async () => {
      // TODO: [bootcamp] migrate to use `useSubscribedBroadcastEvent` hook
      subscribe<AppSettings>({ type: BroadcastEventType.APP_SETTING_UPDATED }, (value) => setAllSettings(value));
      const value = await fetch<AppSettings>({
        type: BroadcastEventType.APP_SETTING_UPDATED,
      });
      if (value) setAllSettings(value);
    };
    exec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAppSettingForKey = async (key: AppSetting, value: unknown) => {
    const newValue = { [key]: value };
    send({ type: BroadcastEventType.APP_SETTING_UPDATED }, { ...allSettings, ...newValue });
  };

  const setAppSetting = async (value: unknown) => {
    if (!key) throw new Error('key is required');
    void setAppSettingForKey(key, value);
  };

  const getSetting = (key: AppSetting) => allSettings[key];

  return {
    allSettings,
    setAppSettingForKey,
    setAppSetting,
    getSetting,
    value: key ? allSettings[key] : undefined,
  };
}
