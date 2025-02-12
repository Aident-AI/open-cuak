import { z } from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage } from '~shared/messaging/types';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';
import { RemoteExtensionService } from '~src/app/api/extension/RemoteExtensionService';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export class InterpreterExecuteApi extends BaseEndpointApi {
  public readonly EndpointConfig = {
    path: '/api/extension/interpreter/execute',
    method: 'post',
    operationId: 'interpreter:execute-command',
    summary:
      'Send a command to Typescript/JavaScript interpreter to execute one line. Async functions are executed sequentially, and the result of the last line is returned.',
  } as const as EndpointConfigType;

  public readonly RequestSchema = {
    required: true,
    schema: z.object({
      code: z.string().describe('The code to execute'),
    }),
  };

  public readonly ResponseSchema = z.object({
    result: z.string().describe('The result of the execution'),
  });

  public override async exec(
    args: z.infer<typeof this.RequestSchema.schema>,
  ): Promise<z.infer<typeof this.ResponseSchema>> {
    const context = ApiRequestContextService.getContext();
    const user = await context.fetchUserOrThrow();
    const message = {
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.INTERPRET_ONE_OFF_LINE,
      payload: args.code,
    } as RuntimeMessage;
    const rsp = await RemoteExtensionService.sendRuntimeMessage(context.getSupabase(), user.id, message);
    if (!rsp.success) throw new Error('Failed to interpret code line: ' + rsp.error); // TODO: better error handling with error code (e.g. 500)
    return { result: JSON.stringify(rsp.data) };
  }
}
