import { CoreMessage, CoreTool, DataStreamWriter, LanguageModel, ToolInvocation } from 'ai';
import { AiAgentNode, IAiAgentInspectionConfig, IAiAgentNodeOptions } from '~shared/agent/AiAgentNode';
import { BaseAgentNodeBuilder } from '~shared/agent/builders/BaseAgentNodeBuilder';

export class AiAgentNodeBuilder extends BaseAgentNodeBuilder<
  CoreMessage,
  LanguageModel,
  CoreTool,
  ToolInvocation,
  IAiAgentNodeOptions
> {
  public static new(): AiAgentNodeBuilder {
    return new AiAgentNodeBuilder();
  }

  public override build(): AiAgentNode {
    if (!this.options.inputMessages) this.options.inputMessages = [];
    if (!this.options.model) throw new Error('Model is required');
    if (!this.options.systemMessages) this.options.systemMessages = [];
    if (!this.options.toolDict) this.options.toolDict = {};

    const node = new AiAgentNode(this.options as IAiAgentNodeOptions);
    this.options = {};
    return node;
  }

  public withDataStream(dataStream: DataStreamWriter): this {
    this.options.dataStream = dataStream;
    return this;
  }

  public withInspectionConfig(config: IAiAgentInspectionConfig): this {
    this.options.inspectionConfig = config;
    return this;
  }
}
