import { AgentRunResult } from '~shared/agent/AgentRunResult';
import { IAgentRunState } from '~shared/agent/IAgentRunState';

export interface IBaseAgentNodeEvents<Msg, ToolCall> {
  onRunStart: () => void | Promise<void>;
  onRunEnd: (result: AgentRunResult) => void | Promise<void>;
  onRunError: (error: Error) => void | Promise<void>;

  onStepStart: () => void | Promise<void>;
  onStepEnd: (step: Msg) => void | Promise<void>;
  onStepError: (error: Error) => void | Promise<void>;

  onToolCallStart: () => void | Promise<void>;
  onToolCallChunk: (chunk: object | null, message: Msg | null, isEnd: boolean) => void | Promise<void>;
  onToolCallEnd: (message: Msg) => void | Promise<void>;
  onToolCallError: (error: Error) => void | Promise<void>;

  onToolCallbackStart: (toolCall: ToolCall) => void | Promise<void>;
  onToolCallbackEnd: (
    toolCall: ToolCall,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rsp: { response: any; responseMessage: Msg; toolCallMessage: Msg },
  ) => void | Promise<void>;
  onToolCallbackError: (toolCall: ToolCall, error: Error) => void | Promise<void>;
}

export interface IBaseAgentNode<Msg, Mdl, Tool, ToolCall> {
  // main loop
  genRun(inputs?: Msg[]): Promise<AgentRunResult>;

  // core functions
  genPromptMessagesForNextToolCall(inputs?: Msg[]): Promise<Msg[]>;
  genGenerateToolCall(messages: Msg[]): Promise<void>;
  genHandleToolCall(): Promise<void>;

  // helper methods
  endRun(reason?: AgentRunResult): AgentRunResult;
  findTool(name: string): Tool;
  getState(): IAgentRunState<Msg>;
  isRunning(): boolean;
  isSuccessful(): boolean;
  setState(state: Partial<IAgentRunState<Msg>>): void;

  // state
  eventHandlers: Partial<IBaseAgentNodeEvents<Msg, ToolCall>>;
  genStepStateMessages?: (state: IAgentRunState<Msg>, messages: Msg[]) => Msg[] | Promise<Msg[]>;
  model: Mdl;
  state: IAgentRunState<Msg>;
  toolDict: Record<string, Tool>;
}
