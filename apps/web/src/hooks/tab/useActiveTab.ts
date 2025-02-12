'use client';

import { useEffect, useState } from 'react';
import { BroadcastEventType } from '~shared/broadcast/types';
import { ChromeTab } from '~shared/chrome/Tab';
import { useBroadcastService } from '~src/hooks/useBroadcastService';

export function useActiveTab() {
  const [activeTab, setActiveTab] = useState<ChromeTab | null>(null);
  const { fetch, subscribe } = useBroadcastService();

  useEffect(() => {
    subscribe({ type: BroadcastEventType.ACTIVE_TAB_UPDATED }, async (tab) => {
      setActiveTab(tab as ChromeTab);
    });

    const fetchActiveTab = async () => {
      if (activeTab) return;
      const tab = await fetch<ChromeTab>({ type: BroadcastEventType.ACTIVE_TAB_UPDATED });
      if (!tab) throw new Error('Failed to fetch active tab');
      setActiveTab(tab);
    };
    fetchActiveTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activeTab };
}
