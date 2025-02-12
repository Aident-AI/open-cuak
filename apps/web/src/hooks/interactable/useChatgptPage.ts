'use client';

import { useEffect, useState } from 'react';
import { BroadcastEventType } from '~shared/broadcast/types';
import { TreeTransformation } from '~shared/utils/TreeTransformation';
import { useInteractable } from '~src/hooks/interactable/useInteractable';
import { useBroadcastService } from '~src/hooks/useBroadcastService';

export function useChatgptPage() {
  const [chatgptTabId, setChatgptTabId] = useState<number | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const { nodeDict, updatedAt } = useInteractable(chatgptTabId ?? undefined);
  const { fetch, subscribe } = useBroadcastService();

  useEffect(() => {
    const exec = async () => {
      const value = await fetch<number | undefined>({ type: BroadcastEventType.CHATGPT_TAB_OPENED });
      setChatgptTabId(!value || value < 0 ? null : value);
      subscribe({ type: BroadcastEventType.CHATGPT_TAB_OPENED }, (id, oldId) => {
        const newId = !id || (id as number) < 0 ? null : (id as number);
        if (!newId && !!oldId) setIsRemoved(true);
        setChatgptTabId(newId);
      });
    };
    exec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootId = Object.values(nodeDict ?? {})[0]?.id;
  const tree = !nodeDict || !rootId ? null : TreeTransformation.dictToTree(nodeDict, rootId);
  return { tabId: chatgptTabId, isRemoved, nodeDict, updatedAt, nodeTree: tree };
}
