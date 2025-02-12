import { z } from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage } from '~shared/messaging/types';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export class PingApi extends BaseEndpointApi {
  public readonly EndpointConfig = {
    path: '/api/extension/ping',
    method: 'post',
    operationId: 'extension:ping',
    summary: 'Send a ping to the extension and receive a `pong` as response if everything goes well.',
  } as const as EndpointConfigType;

  public readonly RequestSchema = { required: false, schema: z.object({}) };

  public readonly ResponseSchema = z.object({ response: z.literal('pong') });

  public override async exec(): Promise<z.infer<typeof this.ResponseSchema>> {
    const message = {
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.PING,
    } as RuntimeMessage;
    const rsp = await ApiRequestContextService.getContext().sendRuntimeMessage(message);

    if (!rsp.success) throw new Error('Failed to send service message: ' + rsp.error); // TODO: better error handling with error code (e.g. 500)
    return rsp.data;
  }
}
