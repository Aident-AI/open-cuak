import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BroadcastEventType } from '~shared/broadcast/types';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { GetActiveTab_ActionConfig } from '~shared/messaging/action-configs/tab/GetActiveTab.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

const requestSchema = z.any();

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: true },
  async (_request, context) => {
    const activeTabRsp = await context.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_ACTIVE_TAB,
    });
    if (!activeTabRsp.success) throw new Error('Failed to get active tab');
    const tab = GetActiveTab_ActionConfig.responsePayloadSchema.parse(activeTabRsp.data);
    const tabId = tab.id;

    const broadcastFetchRsp = await context.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.BROADCAST_FETCH,
      payload: { event: { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId } },
    });
    if (!broadcastFetchRsp.success) throw new Error('Failed to get current mouse position');
    const position = RemoteCursorPositionSchema.parse(broadcastFetchRsp.data);

    return NextResponse.json({ position, url: tab.url });
  },
);
