import { CoreMessage, CoreUserMessage } from 'ai';
import { z } from 'zod';
import { AiAidenSystemPromptVersion } from '~shared/agent/AiAidenSystemPrompts';
import { AiAgentRunStateSchema, IAgentRunState } from '~shared/agent/IAgentRunState';
import { StepRunHistoryType } from '~shared/agent/IBaseAgentNodeOptions';
import { AiAgentNodeBuilder } from '~shared/agent/builders/AiAgentNodeBuilder';
import { GPTVariant, LlmRouterModel } from '~shared/llm/LlmRouterModel';
import { ModelRouter } from '~shared/llm/ModelRouter';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { PageNavigationAction } from '~shared/messaging/action-configs/page-actions/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage } from '~shared/messaging/types';
import { RemoteBrowserSocket } from '~shared/remote-browser/RemoteBrowserSocket';
import { WebVoyagerTaskSchema } from '~shared/web-voyager/WebVoyagerTaskType';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';
import {
  AiAidenCore,
  AiAidenCoreConfig,
  AiAidenCoreInstance,
  DefaultAiAidenCoreConfigPart,
  SERVICE_ROLE_USER_ID,
} from '~src/app/api/ai/aiden/AiAidenCore';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export class WebVoyagerRunTaskApi extends BaseEndpointApi {
  public readonly EndpointConfig = {
    path: '/api/web-voyager/run-task',
    method: 'post',
    operationId: 'web-voyager-run-task',
    summary: 'Run one WebVoyager task.',
  } as const as EndpointConfigType;

  public readonly RequestSchema = {
    required: true,
    schema: z.object({
      task: WebVoyagerTaskSchema,
      maxSteps: z.number(),
    }),
  };

  public readonly ResponseSchema = z
    .object({ success: z.literal(true), runState: AiAgentRunStateSchema })
    .or(z.object({ success: z.literal(false) }));

  public override async exec(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: z.infer<typeof this.RequestSchema.schema>,
  ): Promise<z.infer<typeof this.ResponseSchema>> {
    const context = ApiRequestContextService.getContext();
    const supabase = context.getSupabase();
    const { task, maxSteps } = request;

    const remoteBrowserSessionId = context.getRemoteBrowserSessionId();
    if (!remoteBrowserSessionId) throw new Error('Remote browser session ID from header is required.');

    const killSession = (remoteBrowserSessionId: string) => {
      void RemoteBrowserSocket.killBrowserSession({ userSession: null, useServiceRole: true }, remoteBrowserSessionId);
      ALogger.info({ context: 'Killed session', remoteBrowserSessionId });
    };

    try {
      // Attach to remote browser session
      ALogger.info({ context: 'Attaching to remote browser session', remoteBrowserSessionId });
      const config = { remoteBrowserSessionId, keepAlive: true, useServiceRole: true };
      const { success } = await RemoteBrowserSocket.genAttachToBrowserSession(config);
      if (!success) throw new Error('Failed to attach to the remote browser session.');
      void RemoteBrowserSocket.startScreencast({ userSession: null, useServiceRole: true }, remoteBrowserSessionId);
      void RemoteBrowserSocket.stopScreencast({ userSession: null, useServiceRole: true }, remoteBrowserSessionId);
      const sendRuntimeMessage = (m: RuntimeMessage) =>
        ApiRequestContextService.getContext().sendRuntimeMessage(m, remoteBrowserSessionId);
      ALogger.info({ context: 'Remote browser session attached', remoteBrowserSessionId });

      // Go to task url
      await sendRuntimeMessage({
        receiver: RuntimeMessageReceiver.SERVICE_WORKER,
        action: ServiceWorkerMessageAction.NAVIGATE_PAGE,
        payload: { action: PageNavigationAction.GOTO, url: task.web },
      });
      ALogger.info({ context: 'Navigated to task url', taskUrl: task.web });

      // Generate task
      let runState: IAgentRunState<CoreMessage> | undefined = undefined;
      const coreConfig = {
        ...DefaultAiAidenCoreConfigPart,
        remoteBrowserSessionId,
        systemPromptVersion: AiAidenSystemPromptVersion.LIVE,
        useReAct: true,
        sendRuntimeMessage,
        userId: SERVICE_ROLE_USER_ID,
      } as AiAidenCoreConfig;
      const model = await ModelRouter.genModel({ model: LlmRouterModel.AZURE_OAI, variant: GPTVariant.GPT_4O });
      const core = new AiAidenCoreInstance();
      const toolDict = AiAidenCore.getToolDict(coreConfig);

      // setup agent session for inspection
      const { error } = await supabase
        .from('agent_sessions')
        .insert([{ remote_browser_session_id: remoteBrowserSessionId }]);
      if (error) throw error;

      let builder = AiAgentNodeBuilder.new()
        .withModel(model)
        .withToolDict(toolDict)
        .withEnvironmentStepStateMessages(() => core.genStepStateMessages(coreConfig))
        .withStepRunHistoryType(StepRunHistoryType.LAST_ONE_WITH_ENV_STATE)
        .withMaxSteps(maxSteps * (coreConfig.useReAct ? 2 : 1))
        .withInspectionConfig({ enabled: true, remoteBrowserSessionId, supabase });
      if (runState) builder = builder.withState(runState);
      else builder = builder.withSystemMessage(AiAidenCore.getSystemPrompts(coreConfig));
      const agent = builder.build();

      const inputMessages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'You will be given a website and a task, you will need to go to the website and perform the task.',
            },
            { type: 'text', text: 'The task is: ' + task.ques },
          ],
        } as CoreUserMessage,
      ];
      await agent.genRun(inputMessages);
      runState = agent.getState();
      ALogger.info({ context: 'Task finish', runState });

      killSession(remoteBrowserSessionId);
      return this.ResponseSchema.parse({ runState, success: true });
    } catch (e) {
      ALogger.error({ context: 'Error in running WebVoyager task', error: e });
      killSession(remoteBrowserSessionId);
      return this.ResponseSchema.parse({ success: false });
    }
  }
}
