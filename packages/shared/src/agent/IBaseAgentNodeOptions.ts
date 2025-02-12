import { IAgentRunState } from '~shared/agent/IAgentRunState';
import { IBaseAgentNodeEvents } from '~shared/agent/IBaseAgentNode';

export enum StepRunHistoryType {
  COMPLETE = 'complete',
  CUSTOM = 'custom',
  LAST_ONE_WITH_ENV_STATE = 'last-one-with-env-state',
  LAST_THREE_WITH_ENV_STATE = 'last-three-with-env-state',
  LAST_ONE_WITHOUT_ENV_STATE = 'last-one-without-env-state',
  LAST_THREE_WITHOUT_ENV_STATE = 'last-three-without-env-state',
  NONE = 'none',
  SUMMARY = 'summary',
}

export interface IBaseAgentNodeOptions<Msg, Mdl, Tool, ToolCall> {
  chatHistory: Msg[];
  inputMessages: Msg[];
  maxSteps: number;
  model: Mdl;
  state: IAgentRunState<Msg>;
  systemMessages: Msg[];
  toolDict: Record<string, Tool>;

  abortSignal?: AbortSignal;
  eventHandlers?: Partial<IBaseAgentNodeEvents<Msg, ToolCall>>;
  genStepStateMessages?: (state: IAgentRunState<Msg>, messages: Msg[]) => Msg[] | Promise<Msg[]>;
  stepRunHistoryCustomGenerator?: (state: IAgentRunState<Msg>) => Msg[] | Promise<Msg[]>;
  stepRunHistoryType?: StepRunHistoryType;
}
