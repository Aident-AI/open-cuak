'use client';

import { useEffect, useState } from 'react';
import { BroadcastEventType } from '~shared/broadcast/types';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ShadowModeSession } from '~shared/shadow-mode/ShadowModeSession';
import { useBroadcastService } from '~src/hooks/useBroadcastService';
import { useExtensionService } from '~src/hooks/useExtensionService';

export function useShadowModeService() {
  const { subscribe } = useBroadcastService();
  const { sendRuntimeMessage } = useExtensionService();
  const [session, setSession] = useState(undefined as ShadowModeSession | undefined);

  useEffect(() => {
    subscribe({ type: BroadcastEventType.SHADOW_MODE_SESSION_UPDATED }, (data) =>
      setSession(ShadowModeSession.fromBroadcast(data as string)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (session?.isRecording() || session?.isAnalyzing()) return;
    await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.START_SHADOW_MODE,
    });
  };
  const stop = async () => {
    if (!session?.isRecording()) return;
    await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.STOP_SHADOW_MODE,
    });
  };

  return { session, start, stop };
}
