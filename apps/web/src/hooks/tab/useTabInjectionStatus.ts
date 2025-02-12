'use client';

import { useEffect, useState } from 'react';
import { BroadcastEventType } from '~shared/broadcast/types';
import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { useCurrentTab } from '~src/hooks/tab/useCurrentTab';
import { useBroadcastService } from '~src/hooks/useBroadcastService';

export function useTabInjectionStatus() {
  const { currentTab } = useCurrentTab();
  const { fetch, subscribe } = useBroadcastService();
  const [tabStatus, setTabStatus] = useState<TabLifecycleStatus | null>(null);

  useEffect(() => {
    if (!currentTab || tabStatus) return;

    const event = { type: BroadcastEventType.TAB_INJECTION_STATUS, identifier: currentTab.id };
    subscribe(event, (status) => setTabStatus(status as TabLifecycleStatus));
    const fetchTabStatus = async () => {
      const status = await fetch<TabLifecycleStatus>(event);
      if (!status) throw new Error('Failed to fetch tab status');
      setTabStatus(status);
    };
    fetchTabStatus();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  return { tabStatus };
}
