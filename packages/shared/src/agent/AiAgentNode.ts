import { SupabaseClient } from '@supabase/supabase-js';
import {
  CoreMessage,
  CoreTool,
  CoreToolChoice,
  CoreToolMessage,
  DataStreamWriter,
  LanguageModel,
  TextStreamPart,
  ToolCallPart,
  ToolInvocation,
  createDataStream,
  streamText,
  tool,
} from 'ai';
import { AISDKExporter } from 'langsmith/vercel';
import { v4 as UUID } from 'uuid';
import { z } from 'zod';
import { AgentRunResult, AgentRunResultSchema } from '~shared/agent/AgentRunResult';
import { IAgentRunState } from '~shared/agent/IAgentRunState';
import { IBaseAgentNode, IBaseAgentNodeEvents } from '~shared/agent/IBaseAgentNode';
import { IBaseAgentNodeOptions, StepRunHistoryType } from '~shared/agent/IBaseAgentNodeOptions';
import { ModelRouter } from '~shared/llm/ModelRouter';
import { ALogger } from '~shared/logging/ALogger';

export const DEFAULT_MAX_STEPS = 50;
export const RUN_NAME = 'AiAidenNode';

export interface IAiAgentInspectionConfig {
  enabled: boolean;
  remoteBrowserSessionId: string;
  supabase: SupabaseClient;
}

export interface IAiAgentNodeOptions
  extends IBaseAgentNodeOptions<CoreMessage, LanguageModel, CoreTool, ToolInvocation> {
  dataStream?: DataStreamWriter;
  inspectionConfig?: IAiAgentInspectionConfig;
}

export const DefaultAiFinishRunToolName = 'finish-run';
export const DefaultAiFinishRunToolConfigs = {
  description:
    'Call this function when you have achieved the goal and send the final result to the user. When this is called, this should be the ONLY tool used.',
  parameters: z.object({ message: z.string() }),
  execute: async () => 'ok',
};
export const DefaultAiFinishRunTool = tool(DefaultAiFinishRunToolConfigs);

export const ThinkAndPlanToolName = 'think-and-plan';
export const ThinkAndPlanToolConfigs = {
  description: 'Think and plan the next step, the input should be the thought process and the plan.',
  parameters: z.object({ message: z.string() }),
  execute: async () => 'ok',
};
export const ThinkAndPlanTool = tool(ThinkAndPlanToolConfigs);

export const isFinishRunTool = (name: string) =>
  name === DefaultAiFinishRunToolName || name === DefaultAiFinishRunToolName.replace('-', '_');
export const isRenderTextTool = (name: string) => isFinishRunTool(name) || name === ThinkAndPlanToolName;

export class AiAgentNode implements IBaseAgentNode<CoreMessage, LanguageModel, CoreTool, ToolInvocation> {
  // main loop
  public async genRun(inputs?: CoreMessage[]): Promise<AgentRunResult> {
    if (inputs) this.setState({ inputMessages: inputs });

    try {
      void this.eventHandlers.onRunStart?.();

      while (this.isRunning()) {
        if (this.getState().stepCount >= this.getState().maxSteps)
          return this.endRun({ success: false, error: 'Maximum steps exceeded' });

        try {
          void this.eventHandlers.onStepStart?.();

          const messages = await this.genPromptMessagesForNextToolCall();
          await this.genGenerateToolCall(messages);
          await this.genHandleToolCall();
          this.setState({ stepCount: this.getState().stepCount + 1 });

          const lastStep = this.getState().stepHistory[this.getState().stepHistory.length - 1];
          void this.eventHandlers.onStepEnd?.(lastStep);
        } catch (error) {
          if (this.#isAbortError(error)) return this.endRun({ success: false, error: 'Operation aborted by user' });

          ALogger.error({ context: 'AiAgentNode.genRun' }, error);
          void this.eventHandlers.onStepError?.(error as Error);
          return this.endRun({ success: false, error: error as string });
        }
      }

      if (this.isRunning()) return this.endRun({ success: false, error: 'Unexpected end of loop' });
      const runResult = this.getState().runResult;
      if (!runResult) throw new Error('No run result found');
      void this.eventHandlers.onRunEnd?.(runResult);
      return runResult;
    } catch (error) {
      ALogger.error({ context: 'AiAgentNode.genRun' }, error);
      void this.eventHandlers.onRunError?.(error as Error);
      throw error;
    }
  }

  public async *genRunToDataStream() {
    yield createDataStream({
      execute: async (dataStream) => {
        this.dataStream = dataStream;
        await this.genRun();
        this.dataStream = undefined;
      },
      onError: (error) => {
        // Error messages are masked by default for security reasons.
        // If you want to expose the error message to the client, you can do so here:
        return error instanceof Error ? error.message : String(error);
      },
    });
  }

  // core functions
  public async genPromptMessagesForNextToolCall(inputs?: CoreMessage[]): Promise<CoreMessage[]> {
    if (inputs) this.setState({ inputMessages: inputs });

    const messages = [
      ...this.getState().systemMessages,
      ...(this.getState().chatHistory ?? []),
      ...this.getState().inputMessages,
    ];

    const stepHistory = await this.#genStepRunHistory(this.getState());
    messages.push(...stepHistory);

    const stateMessages = (await this.genStepStateMessages?.(this.getState(), messages)) ?? [];
    this.state.stepEnvStateHistory.push(stateMessages);
    messages.push(...stateMessages);

    return messages;
  }

  public async genGenerateToolCall(messages: CoreMessage[]): Promise<void> {
    try {
      void this.eventHandlers.onToolCallStart?.();

      await new Promise<void>((resolve, reject) => {
        const exec = async () => {
          try {
            const prepareTools = () => {
              let localToolDict = this.toolDict;

              // If toolDict includes think-and-plan tool and the last tool call is not think-and-plan
              // we force the model to use it.
              if (localToolDict[ThinkAndPlanToolName]) {
                const lastStepMessages = this.getState().stepHistory.filter(
                  (m) => m.stepNum === this.getState().stepCount - 1,
                );
                if (lastStepMessages.some((m) => m.role === 'tool' && m.content[0].toolName !== ThinkAndPlanToolName)) {
                  localToolDict = Object.fromEntries(
                    Object.entries(localToolDict).filter(([toolName]) => toolName === ThinkAndPlanToolName),
                  );
                }
              }

              if (!ModelRouter.isClaude(this.model)) return localToolDict;

              // Transform tool names to snake_case for Claude
              const tools = {} as Record<string, CoreTool>;
              Object.entries(localToolDict).forEach(([toolName, tool]) => {
                tools[toolName.replaceAll('-', '_')] = tool;
              });
              return tools;
            };

            const tools = prepareTools();
            const getToolChoice = (): CoreToolChoice<CoreTool> => {
              const numOfTools = Object.keys(tools).length;
              if (numOfTools < 1) return 'none';
              if (numOfTools === 1) return { type: 'tool', toolName: Object.keys(tools)[0] as keyof CoreTool };

              // multiple tools available
              const isVllm = this.model.provider.startsWith('vllm');
              return isVllm ? 'auto' : 'required'; // vllm does not support 'required' toolChoice for now
            };
            const stream = streamText({
              model: this.model,
              messages,
              tools,
              toolChoice: getToolChoice(),
              maxSteps: 1,
              abortSignal: this.abortSignal,
              experimental_toolCallStreaming: true,
              experimental_telemetry: AISDKExporter.getSettings({ runName: RUN_NAME, runId: this.runId }),
              onChunk: (event) => {
                void this.eventHandlers.onToolCallChunk?.(event.chunk as object, null, false);
              },
              onFinish: (event) => {
                ALogger.info({ context: 'AiAgentNode.genGenerateToolCall.onFinish' });

                const stepNum = this.getState().stepCount;
                const [assistantMessage, ...toolMessages] = event.response.messages;
                if (assistantMessage.role !== 'assistant')
                  throw new Error('Unexpected first response message type of ' + assistantMessage.role);
                if (toolMessages.some((m) => m.role !== 'tool'))
                  throw new Error('Unexpected non-tool message in tool call response');
                if (Array.isArray(assistantMessage.content) && assistantMessage.content.length > 1) {
                  const toolCallCount = assistantMessage.content.filter((c) => c.type === 'tool-call').length;
                  if (toolCallCount !== toolMessages.length)
                    throw new Error(
                      `Unexpected tool-call response count mismatch: toolCallCount of ${toolCallCount} vs ${toolMessages.length}`,
                    );
                }

                void this.eventHandlers.onToolCallChunk?.(null, assistantMessage, true);

                const stepMessages = [
                  { ...assistantMessage, stepNum },
                  ...toolMessages.map((m) => ({ ...m, stepNum })),
                ];
                this.setState({ stepHistory: [...this.getState().stepHistory, ...stepMessages] });

                // TODO: handle this.eventHandlers.onToolCallEnd
                // void this.eventHandlers.onToolCallEnd?.(response as AIMessage);

                resolve();
              },
            });

            let merged = false;
            const parts = [] as TextStreamPart<Record<string, CoreTool>>[];
            let savedPartLength = 0;
            const { enabled: inspectionEnabled, supabase, remoteBrowserSessionId } = this.inspectionConfig ?? {};
            const genSavePart = async () => {
              if (!inspectionEnabled) return;
              if (!supabase) throw new Error('Supabase client is required for inspection');
              if (!remoteBrowserSessionId) throw new Error('Remote browser session ID is required for inspection');

              const currPartsLength = parts.length;
              if (currPartsLength <= savedPartLength) return; // avoid overwriting newer parts

              const { error } = await supabase
                .from('agent_sessions')
                .update({ streaming_parts: parts })
                .eq('remote_browser_session_id', remoteBrowserSessionId);
              if (error) throw error;
              savedPartLength = currPartsLength;
            };

            for await (const part of stream.fullStream) {
              if (inspectionEnabled) {
                parts.push(part);
                void genSavePart(); // save to supabase asynchronously
              }

              switch (part.type) {
                case 'error': {
                  const error = part.error as Error;
                  if (error.message.includes('Too many requests, please wait before trying again.')) {
                    ALogger.warn({ context: 'reached model throttle. wait for 10s and try again.', error });
                    await new Promise((r) => setTimeout(r, 10_000));
                    await this.genGenerateToolCall(messages);
                    resolve();
                  } else {
                    ALogger.error({ context: 'AiAgentNode.caughtPartError', error });
                    throw error;
                  }
                  break;
                }
                default: {
                  if (!merged && this.dataStream) stream.mergeIntoDataStream(this.dataStream);
                  merged = true;

                  // do nothing
                  continue;
                }
              }
            }
            await genSavePart(); // ensure the last part is saved
          } catch (error) {
            if (!this.#isAbortError(error)) ALogger.error({ context: 'AiAgentNode.genGenerateToolCall.exec', error });
            reject(error);
          }
        };
        exec();
      });
    } catch (error) {
      if (!this.#isAbortError(error)) {
        ALogger.error({ context: 'AiAgentNode.genGenerateToolCall.main', error });
        void this.eventHandlers.onToolCallError?.(error as Error);
      }
      throw error;
    }
  }

  public async genHandleToolCall(): Promise<void> {
    const stepNum = this.getState().stepCount;
    const [assistantMessage, ...toolMessages] = this.state.stepHistory.filter((m) => m.stepNum === stepNum);
    if (!assistantMessage) throw new Error('No assistant message for step found!');

    if (toolMessages.length < 1) {
      let text: string = '';
      if (typeof assistantMessage.content === 'string') text = assistantMessage.content;
      else {
        assistantMessage.content.forEach((part) => {
          // TODO: whether to concatenate or append as newline
          if (typeof part === 'string') text += part;
          else if (part.type === 'text') text += part.text;
          else throw new Error('Unexpected tool-call without response.');
        });
      }
      const runResult = AgentRunResultSchema.parse({ success: true, finalResult: text });
      return void this.endRun(runResult);
    }

    const toolCallContent = assistantMessage.content;
    if (typeof toolCallContent === 'string') throw new Error('Unexpected string as tool call');
    const toolCalls: ToolCallPart[] = [];
    toolCallContent.forEach((part) => {
      if (part.type !== 'tool-call') return; // do nothing for now
      toolCalls.push(part);
    });
    if (toolCalls.length < 1) throw new Error('No tool calls found in tool call response');

    const isFinishRunToolCalled = toolCalls.some((c) => isFinishRunTool(c.toolName));
    if (isFinishRunToolCalled) {
      if (toolCalls.length !== 1)
        throw new Error('When finish-run tool is used, there should be exactly one tool call');
      const finishResult = DefaultAiFinishRunTool.parameters.parse(toolCalls[0].args);
      ALogger.info({ context: 'AiAgentNode.genGenerateToolResponses.finish_run', finish_run: finishResult });
      return void this.endRun({ success: true, finalResult: finishResult.message });
    }

    if (toolMessages.some((m) => Array.isArray(m.content) && m.content.length > 1))
      throw new Error('Unexpected tool-call with multiple responses');
    const toolMessageDict = {} as Record<string, CoreToolMessage>;
    toolMessages.forEach((m) => {
      if (m.role !== 'tool') throw new Error('Unexpected non-tool message in tool call response');
      const content = m.content[0];
      if (!content.toolCallId) throw new Error('Tool call ID is required');
      toolMessageDict[content.toolCallId] = m;
    });

    toolCalls.forEach(async (toolCall) => {
      if (!toolCall.toolCallId) throw new Error('Tool call ID is required');
      const toolMessage = toolMessageDict[toolCall.toolCallId];
      if (!toolMessage) throw new Error('Tool message not found for tool call');

      const toolInvocation: ToolInvocation = {
        state: 'result',
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: toolMessage.content[0],
      };

      void this.eventHandlers.onToolCallbackEnd?.(toolInvocation, {
        response: toolInvocation.result,
        responseMessage: assistantMessage,
        toolCallMessage: assistantMessage,
      });
    });
  }

  // helper methods
  public endRun(result: AgentRunResult): AgentRunResult {
    this.setState({ runResult: result });
    return result;
  }

  public findTool(name: string): CoreTool {
    const tool = this.toolDict[name];
    if (!tool) throw new Error(`Tool with name ${name} not found`);
    return tool;
  }

  public getState(): IAgentRunState<CoreMessage> {
    return this.state;
  }

  public isRunning(): boolean {
    return !this.state.runResult;
  }

  public isSuccessful(): boolean {
    return this.state.runResult?.success ?? false;
  }

  public setState(state: Partial<IAgentRunState<CoreMessage>>): void {
    this.state = { ...this.state, ...state };
  }

  public eventHandlers: Partial<IBaseAgentNodeEvents<CoreMessage, ToolInvocation>>;
  public model: LanguageModel;
  public runId: string = UUID();
  public state: IAgentRunState<CoreMessage>;
  public stepRunHistoryType: StepRunHistoryType;
  public toolDict: Record<string, CoreTool>;

  public abortSignal?: AbortSignal;
  public dataStream?: DataStreamWriter;
  public genStepStateMessages?: (
    state: IAgentRunState<CoreMessage>,
    messages: CoreMessage[],
  ) => CoreMessage[] | Promise<CoreMessage[]>;
  public inspectionConfig?: IAiAgentInspectionConfig;
  public stepRunHistoryCustomGenerator?: (state: IAgentRunState<CoreMessage>) => CoreMessage[] | Promise<CoreMessage[]>;

  constructor(options: IAiAgentNodeOptions) {
    this.eventHandlers = options.eventHandlers ?? {};
    this.genStepStateMessages = options.genStepStateMessages;
    this.model = options.model;
    this.state = options.state ?? {
      chatHistory: options.chatHistory,
      inputMessages: options.inputMessages,
      maxSteps: options.maxSteps ?? DEFAULT_MAX_STEPS,
      runResult: undefined,
      stepCount: 0,
      stepEnvStateHistory: [],
      stepHistory: [],
      systemMessages: options.systemMessages,
    };
    this.toolDict = {};
    Object.entries(options.toolDict).forEach(
      ([toolName, tool]) =>
        (this.toolDict[toolName] = {
          ...tool,
          execute: tool.execute
            ? (args, options) => {
                void this.eventHandlers.onToolCallStart?.();
                return tool.execute!(args, options);
              }
            : undefined,
        }),
    );
    if (!this.toolDict[DefaultAiFinishRunToolName]) this.toolDict[DefaultAiFinishRunToolName] = DefaultAiFinishRunTool;

    if (this.stepRunHistoryCustomGenerator && options.stepRunHistoryType !== StepRunHistoryType.CUSTOM)
      throw new Error('stepRunHistoryCustomGenerator can only be used with CUSTOM step run history type');
    if (options.stepRunHistoryType === StepRunHistoryType.CUSTOM && !this.stepRunHistoryCustomGenerator)
      throw new Error('stepRunHistoryCustomGenerator is required when stepRunHistoryType is CUSTOM');
    this.stepRunHistoryType = options.stepRunHistoryType ?? StepRunHistoryType.COMPLETE;
    this.stepRunHistoryCustomGenerator = options.stepRunHistoryCustomGenerator;
    this.dataStream = options.dataStream;
    this.abortSignal = options.abortSignal;
    this.inspectionConfig = options.inspectionConfig;
  }

  async #genStepRunHistory(state: IAgentRunState<CoreMessage>): Promise<CoreMessage[]> {
    switch (this.stepRunHistoryType) {
      case StepRunHistoryType.COMPLETE: {
        return state.stepHistory;
      }
      case StepRunHistoryType.CUSTOM: {
        if (!this.stepRunHistoryCustomGenerator) throw new Error('unexpected undefined stepRunHistoryCustomGenerator');
        return await this.stepRunHistoryCustomGenerator(state);
      }
      case StepRunHistoryType.LAST_ONE_WITH_ENV_STATE: {
        const lastStepMessages = state.stepHistory.filter((m) => m.stepNum === this.getState().stepCount - 1);
        const lastEnvState = state.stepEnvStateHistory[state.stepCount - 1] ?? [];
        return [...lastEnvState, ...lastStepMessages];
      }
      case StepRunHistoryType.LAST_THREE_WITH_ENV_STATE: {
        const historyLength = 3;
        const stepRunHistory = [] as CoreMessage[];
        for (let i = 0; i < historyLength; i++) {
          const stepNum = this.getState().stepCount - historyLength + i;
          const stepMessages = state.stepHistory.filter((m) => m.stepNum === stepNum);
          const stepEnvState = state.stepEnvStateHistory[stepNum] ?? [];
          stepRunHistory.push(...stepEnvState, ...stepMessages);
        }
        return stepRunHistory;
      }
      case StepRunHistoryType.LAST_ONE_WITHOUT_ENV_STATE: {
        return state.stepHistory.filter((m) => m.stepNum === this.getState().stepCount - 1);
      }
      case StepRunHistoryType.LAST_THREE_WITHOUT_ENV_STATE: {
        const historyLength = 3;
        const stepRunHistory = [] as CoreMessage[];
        for (let i = 0; i < historyLength; i++) {
          const stepNum = this.getState().stepCount - historyLength + i;
          const stepMessages = state.stepHistory.filter((m) => m.stepNum === stepNum);
          stepRunHistory.push(...stepMessages);
        }
        return stepRunHistory;
      }
      case StepRunHistoryType.NONE: {
        return [];
      }
      case StepRunHistoryType.SUMMARY: {
        throw new Error('Not implemented yet');
      }
      default: {
        throw new Error('Invalid step run history type');
      }
    }
  }

  #isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }
}
