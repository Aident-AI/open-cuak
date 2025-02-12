import { BroadcastEventType } from '~shared/broadcast/types';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPosition } from '~shared/portal/RemoteBrowserTypes';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';
import { TabLifecycleInjectionService } from '~src/common/services/tab/TabLifecycleInjectionService';

export class MouseTrackingInjection {
  public static init(): void {
    const currentTabId = TabLifecycleInjectionService.getCurrentTabId();
    const broadcastEvent = { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: currentTabId };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventHandler = (event: any) =>
      window.postMessage(JSON.stringify({ type: 'mousePositionRequest', payload: event }), '*');
    const publishCursorPosition = () =>
      BroadcastService.fetch<RemoteCursorPosition>(broadcastEvent).then((cursorPosition) => {
        if (cursorPosition) eventHandler(cursorPosition);
        else
          sendRuntimeMessage({
            receiver: RuntimeMessageReceiver.SERVICE_WORKER,
            action: ServiceWorkerMessageAction.MOUSE_RESET,
            payload: {},
          });
      });

    BroadcastService.subscribe<RemoteCursorPosition>(broadcastEvent, eventHandler);
    publishCursorPosition();

    const onRemoteConnectionAttachedBroadcastEvent = { type: BroadcastEventType.ON_REMOTE_CONNECTION_ATTACHED };
    const handleRemoteConnectionOnAttached = async (event: number | undefined) => {
      if (!event || event < 0) return;
      // eslint-disable-next-line no-console
      console.log('handling remote connection on attached', event);
      await publishCursorPosition();
      await BroadcastService.send(onRemoteConnectionAttachedBroadcastEvent, -1);
    };
    BroadcastService.subscribe(onRemoteConnectionAttachedBroadcastEvent, async (event: number) => {
      const activeTab = await ActiveTabService.fetch();
      const isActiveTab = currentTabId === activeTab.id;
      if (isActiveTab) handleRemoteConnectionOnAttached(event);
    });
    BroadcastService.fetch<number>(onRemoteConnectionAttachedBroadcastEvent).then(handleRemoteConnectionOnAttached);
  }
}

declare global {
  interface Window {
    reportMousePosition?: (event: string) => void;
  }
}
