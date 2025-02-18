import { CoreMessage, CoreTool, DataStreamWriter, LanguageModel, ToolInvocation } from 'ai';
import { AiAgentSOPNode, IAiAgentSOPNodeOptions } from '~shared/agent/AiAgentSOPNode';
import { BaseAgentNodeBuilder } from '~shared/agent/builders/BaseAgentNodeBuilder';
import { IAiAgentInspectionConfig } from '~shared/export-map.generated';
import { AiAgentSOP } from '~shared/sop/AiAgentSOP';

export class AiAgentSOPNodeBuilder extends BaseAgentNodeBuilder<
  CoreMessage,
  LanguageModel,
  CoreTool,
  ToolInvocation,
  IAiAgentSOPNodeOptions
> {
  public static new(): AiAgentSOPNodeBuilder {
    return new AiAgentSOPNodeBuilder();
  }

  public override build(): AiAgentSOPNode {
    if (!this.options.inputMessages) this.options.inputMessages = [];
    if (!this.options.model) throw new Error('Model is required');
    if (!this.options.systemMessages) this.options.systemMessages = [];
    if (!this.options.toolDict) this.options.toolDict = {};

    const node = new AiAgentSOPNode(this.options as IAiAgentSOPNodeOptions);
    this.options = {};
    return node;
  }

  // TODO move this to BaseAgentNodeBuilder
  public withDataStream(dataStream: DataStreamWriter): this {
    this.options.dataStream = dataStream;
    return this;
  }

  // TODO move this to BaseAgentNodeBuilder
  public withInspectionConfig(config: IAiAgentInspectionConfig): this {
    this.options.inspectionConfig = config;
    return this;
  }

  public withSOP(sop: AiAgentSOP): this {
    this.options.sop = sop;
    return this;
  }
}
