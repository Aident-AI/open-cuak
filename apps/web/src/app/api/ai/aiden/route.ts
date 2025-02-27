import { convertToCoreMessages, createDataStreamResponse } from 'ai';
import { z } from 'zod';
import { DEFAULT_MAX_STEPS } from '~shared/agent/AiAgentNode';
import { AiAidenSystemPromptVersion } from '~shared/agent/AiAidenSystemPrompts';
import { StepRunHistoryType } from '~shared/agent/IBaseAgentNodeOptions';
import { AiAgentNodeBuilder } from '~shared/agent/builders/AiAgentNodeBuilder';
import { AiAgentSOPNodeBuilder } from '~shared/agent/builders/AiAgentSOPNodeBuilder';
import { ModelRouter } from '~shared/llm/ModelRouter';
import { ALogger } from '~shared/logging/ALogger';
import { AiAgentSOP, AiAgentSOPSchema } from '~shared/sop/AiAgentSOP';
import { AiAidenApi, AiAidenStreamDataSchema, AiAidenStreamStateInfoSchema } from '~src/app/api/ai/aiden/AiAidenApi';
import { AiAidenCore, AiAidenCoreConfig, AiAidenCoreInstance } from '~src/app/api/ai/aiden/AiAidenCore';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs';

const api = new AiAidenApi();

export const POST = simpleRequestWrapper<z.infer<typeof api.RequestSchema.schema>>(
  api.RequestSchema.schema,
  { assertUserLoggedIn: true, skipResponseParsing: true },
  async (request, context, _path, signal) => {
    const [user, userConfig] = await Promise.all([context.fetchUserOrThrow(), context.fetchUserConfig()]);

    const model = ModelRouter.getModelFromUserConfigOrThrow(userConfig);
    const systemPromptVersion = AiAidenSystemPromptVersion.LIVE;
    const useReAct = true;

    // prepare core configs
    const remoteBrowserSessionId = context.getRemoteBrowserSessionId();
    const sendRuntimeMessage = context.sendRuntimeMessage;
    const connectedConfig = { remoteBrowserSessionId, sendRuntimeMessage };
    const coreConfig = {
      baseMaxSteps: request.maxSteps ?? DEFAULT_MAX_STEPS,
      isBenchmark: request.isBenchmark ?? false,
      isClaude: ModelRouter.isClaude(model),
      remoteBrowserConnected: await AiAidenCore.genTestRemoteBrowserConnection(connectedConfig),
      remoteBrowserSessionId,
      sendRuntimeMessage,
      systemPromptVersion,
      useReAct,
      userId: user.id,
    } as AiAidenCoreConfig;

    let sop: AiAgentSOP | undefined;
    if (request.sopId) {
      const { data: sopData } = await context
        .getSupabase()
        .from('prebuilt_sops')
        .select('*')
        .eq('id', request.sopId)
        .maybeSingle();
      if (sopData) sop = AiAgentSOPSchema.parse(sopData);
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const maxStepMultiplier = coreConfig.isBenchmark && coreConfig.useReAct ? 2 : 1; // For ReAct, there is always a think step before an execution step
        const maxSteps = (request.maxSteps ?? DEFAULT_MAX_STEPS) * maxStepMultiplier;

        const core = new AiAidenCoreInstance();
        const fetchStepState = async () => {
          if (!remoteBrowserSessionId) return [];
          try {
            const stateMessages = await core.genStepStateMessages(coreConfig);
            const data = { type: 'state-info', annotation: core.lastStepAnnotation };
            dataStream.writeData(AiAidenStreamStateInfoSchema.parse(data));
            return stateMessages;
          } catch (error) {
            ALogger.error({ context: 'fetchStepState', error });
            return [];
          }
        };

        let result;
        if (sop) {
          const sopAgent = AiAgentSOPNodeBuilder.new()
            .withModel(model)
            .withSystemMessage(AiAidenCore.getSystemPrompts(coreConfig))
            .withChatHistory([...convertToCoreMessages(request.messages)])
            .withToolDict(AiAidenCore.getToolDict(coreConfig))
            .withEnvironmentStepStateMessages(fetchStepState)
            .withDataStream(dataStream)
            .withAbortSignal(signal)
            .withStepRunHistoryType(StepRunHistoryType.LAST_THREE_WITHOUT_ENV_STATE)
            .withMaxSteps(maxSteps)
            .withSOP(sop)
            .build();
          result = await sopAgent.genRunSOP();
        } else {
          const agent = AiAgentNodeBuilder.new()
            .withModel(model)
            .withSystemMessage(AiAidenCore.getSystemPrompts(coreConfig))
            .withChatHistory([...convertToCoreMessages(request.messages)])
            .withToolDict(AiAidenCore.getToolDict(coreConfig))
            .withEnvironmentStepStateMessages(fetchStepState)
            .withDataStream(dataStream)
            .withAbortSignal(signal)
            .withStepRunHistoryType(StepRunHistoryType.LAST_THREE_WITHOUT_ENV_STATE)
            .withMaxSteps(maxSteps)
            .build();
          result = await agent.genRun();
        }

        ALogger.info({ context: '/api/llm/agent', result });
        if (!result.success) {
          const newData = AiAidenStreamDataSchema.parse({ type: 'error', error: result.error ?? 'Unknown error' });
          dataStream.writeData(newData);
        }
      },
      onError: (error) => {
        return error instanceof Error ? error.message : String(error);
      },
    });
  },
);
