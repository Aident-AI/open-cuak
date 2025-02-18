import { DataStreamWriter } from 'ai';
import { IAgentRunState } from '~shared/agent/IAgentRunState';
import { IBaseAgentNode, IBaseAgentNodeEvents } from '~shared/agent/IBaseAgentNode';
import { IBaseAgentNodeOptions, StepRunHistoryType } from '~shared/agent/IBaseAgentNodeOptions';
import { IAiAgentInspectionConfig } from '~shared/export-map.generated';

export abstract class BaseAgentNodeBuilder<
  Msg,
  Mdl,
  Tool,
  ToolCall,
  Options extends IBaseAgentNodeOptions<Msg, Mdl, Tool, ToolCall>,
> {
  public withAbortSignal(abortSignal?: AbortSignal): this {
    this.options.abortSignal = abortSignal;
    return this;
  }

  public withEventHandlers(eventHandlers: Partial<IBaseAgentNodeEvents<Msg, ToolCall>>): this {
    this.options.eventHandlers = eventHandlers;
    return this;
  }

  public withEnvironmentStepStateMessages(
    genStepStateMessages: (state: IAgentRunState<Msg>, messages: Msg[]) => Msg[] | Promise<Msg[]>,
  ): this {
    this.options.genStepStateMessages = genStepStateMessages;
    return this;
  }

  public withInputMessages(inputs: Msg[]): this {
    this.options.inputMessages = inputs;
    return this;
  }

  public withSystemMessage(systemMessages: Msg[]): this {
    this.options.systemMessages = systemMessages;
    return this;
  }

  public withChatHistory(chatHistory: Msg[]): this {
    this.options.chatHistory = chatHistory;
    return this;
  }

  public withModel(model: Mdl): this {
    this.options.model = model;
    return this;
  }

  public withToolDict(toolDict: Record<string, Tool>): this {
    this.options.toolDict = toolDict;
    return this;
  }

  public withState(state: IAgentRunState<Msg>): this {
    this.options.state = state;
    return this;
  }

  public withStepRunHistoryType(stepRunHistoryType: StepRunHistoryType): this {
    this.options.stepRunHistoryType = stepRunHistoryType;
    return this;
  }

  public withMaxSteps(maxSteps?: number): this {
    this.options.maxSteps = maxSteps;
    return this;
  }

  public withDataStream(dataStream: DataStreamWriter): this {
    this.options.dataStream = dataStream;
    return this;
  }

  public withInspectionConfig(config: IAiAgentInspectionConfig): this {
    this.options.inspectionConfig = config;
    return this;
  }

  public options: Partial<Options> = {};

  abstract build(): IBaseAgentNode<Msg, Mdl, Tool, ToolCall>;
}
