'use client';

import { useInteractable } from '~src/hooks/interactable/useInteractable';
import { useActiveTab } from '~src/hooks/tab/useActiveTab';

export function useActiveTabInteractable() {
  const { activeTab } = useActiveTab();
  const { nodeDict, updatedAt } = useInteractable(activeTab?.id ?? undefined);

  return { nodeDict, activeTab, updatedAt };
}
