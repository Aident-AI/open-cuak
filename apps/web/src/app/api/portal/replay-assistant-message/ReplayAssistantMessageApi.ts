import { z } from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { FetchCurrentCursorType_ActionConfig } from '~shared/messaging/action-configs/FetchCurrentCursorType.ActionConfig';
import { Screenshot_ActionConfig } from '~shared/messaging/action-configs/page-actions/Screenshot.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';
import { AiAidenApiMessageAnnotation, AiAidenApiMessageAnnotationSchema } from '~src/app/api/ai/aiden/AiAidenApi';
import { VisionBasedBrowserControlApiSpec } from '~src/app/api/extension/VisionBasedBrowserControlApiSpec';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export class ReplayAssistantMessageApi extends BaseEndpointApi {
  public readonly EndpointConfig = {
    path: '/api/portal/replay-assistant-message',
    method: 'post',
    operationId: 'portal:replay-assistant-message',
    summary: 'Replay an assistant message to mimic the behavior of the ai responding with potential tool calls.',
  } as const as EndpointConfigType;

  public readonly RequestSchema = {
    required: true,
    schema: z.object({
      ts: z.number().describe('The timestamp of the message.'),
      toolInvocation: z.any().optional().describe('The tool invocation to execute.'),
      stepMessages: z.any().describe('The messages to send along with the tool invocation.'),
    }),
  };

  public readonly ResponseSchema = z.object({ success: z.boolean(), annotation: AiAidenApiMessageAnnotationSchema });

  public override async exec(
    request: z.infer<typeof this.RequestSchema.schema>,
  ): Promise<z.infer<typeof this.ResponseSchema>> {
    const context = ApiRequestContextService.getContext();

    const user = await context.fetchUserOrThrow();
    const remoteBrowserSessionId = context.getRemoteBrowserSessionId();

    // take screenshot
    const screenshotRsp = await context.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.SCREENSHOT,
      payload: { config: { withCursor: true } },
    });
    if (!screenshotRsp.success) throw new Error('Failed to take screenshot');
    const { base64 } = Screenshot_ActionConfig.responsePayloadSchema.parse(screenshotRsp.data);
    if (!base64) throw new Error('Failed to take screenshot. No base64 data found.');

    // fetch mouse cursor type
    const cursorTypeResponse = await context.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.CURRENT_CURSOR_TYPE,
    });
    if (!cursorTypeResponse || !cursorTypeResponse.success) throw new Error('Failed to fetch cursor type.');
    const currCursor = FetchCurrentCursorType_ActionConfig.responsePayloadSchema.parse(cursorTypeResponse.data);

    // execute tool invocation
    const toolDict = new VisionBasedBrowserControlApiSpec().getAiToolDict();
    const ti = request.toolInvocation;
    if (ti) {
      const tool = toolDict[ti.toolName];
      if (!tool) throw new Error(`Tool not found: ${ti.toolName}`);
      if (!tool.execute) throw new Error('Tool does not have an execute method');

      const response = await tool.execute(ti.args, { toolCallId: ti.toolCallId, messages: request.stepMessages });
      if (response !== ti.result) throw new Error('Tool response mismatch');
    }

    const annotation = {
      ts: Date.now(),
      beforeStateBase64: base64,
      cursorType: currCursor.type,
      cursorPosition: currCursor.position,
    } as AiAidenApiMessageAnnotation;
    return this.ResponseSchema.parse({ success: true, annotation });
  }
}
