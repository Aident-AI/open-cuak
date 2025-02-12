'use client';

import { useRef } from 'react';
import { Replayer } from 'rrweb';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RRSnapshot } from '~shared/shadow-mode/RRSnapshot';

export function useBaseReplayerRuntime() {
  const replayerRef = useRef<Replayer | undefined>(undefined);

  const getReplayer = () => {
    if (!replayerRef.current) throw new Error('Replayer is not initialized');
    return replayerRef.current;
  };

  const getMirror = () => getReplayer().getMirror();

  const getDocument = (timeOffset?: number) => {
    if (timeOffset) getReplayer().pause(timeOffset);
    return getReplayer().iframe.contentDocument;
  };

  const getSnapshot = (timeOffset?: number) => {
    const document = getDocument(timeOffset);
    if (!document) {
      ALogger.warn('Document is not available');
      return undefined;
    }
    return RRSnapshot.buildFullPageSnapshot(document);
  };

  const buildInteractable = async (ts: number): Promise<InteractableObject.TreeNode> => {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.BUILD_INTERACTABLE_FOR_SNAPSHOT,
      payload: getSnapshot(ts),
    });
    if (!rsp || !rsp.success || !rsp.data) throw new Error('Failed to build interactable');
    return rsp.data as InteractableObject.TreeNode;
  };

  return { replayerRef, getReplayer, getMirror, getDocument, getSnapshot, buildInteractable };
}
