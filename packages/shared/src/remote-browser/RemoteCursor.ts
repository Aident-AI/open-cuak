import { BroadcastEventType } from '~shared/broadcast/types';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { GetActiveTab_ActionConfig } from '~shared/messaging/action-configs/tab/GetActiveTab.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';
import { RemoteCursorPosition, RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';
import RemoteCursorBase64 from '~shared/remote-browser/cursor-base64.json';

export const RemoteCursorTypeToBase64: Record<string, string> = {
  'not-allowed': RemoteCursorBase64.NOT_ALLOWED,
  default: RemoteCursorBase64.DEFAULT,
  move: RemoteCursorBase64.MOVE,
  pointer: RemoteCursorBase64.POINTER,
  text: RemoteCursorBase64.TEXT,
} as const;

export const RemoteCursorHighlightCircleSize = 120;
export const RemoteCursorFocusCircleSize = 8;
export const RemoteCursorSize = 100;

export const SupportedRemoteCursorTypes = new Set(Object.keys(RemoteCursorTypeToBase64));

export const RemoteCursorPositionCenterOffset: Record<string, { x: number; y: number }> = {
  'not-allowed': { x: -22, y: -2 },
  default: { x: -31, y: -23 },
  auto: { x: -31, y: -23 },
  move: { x: -50, y: -25 },
  pointer: { x: -41, y: -25 },
  text: { x: -51, y: -23 },
};

export class RemoteCursorHelper {
  public static async genFetchCurrentPositionOrThrow(
    sendRuntimeMessage: (message: RuntimeMessage) => Promise<RuntimeMessageResponse>,
  ): Promise<RemoteCursorPosition> {
    const position = await this.genFetchCurrentPosition(sendRuntimeMessage);
    if (!position) throw new Error('Failed to get current mouse position');
    return position;
  }

  public static async genFetchCurrentPosition(
    sendRuntimeMessage: (message: RuntimeMessage) => Promise<RuntimeMessageResponse>,
  ): Promise<RemoteCursorPosition | undefined> {
    const tabRsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_ACTIVE_TAB,
    });
    if (!tabRsp.success) throw new Error('Failed to get active tab');
    const tab = GetActiveTab_ActionConfig.responsePayloadSchema.parse(tabRsp.data);

    const tabId = tab.id;
    const beforePositionRsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.BROADCAST_FETCH,
      payload: { event: { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId } },
    });
    if (!beforePositionRsp.success) throw new Error('Failed to get current mouse position');
    if (!beforePositionRsp.data) return undefined;
    return RemoteCursorPositionSchema.parse(beforePositionRsp.data);
  }
}
