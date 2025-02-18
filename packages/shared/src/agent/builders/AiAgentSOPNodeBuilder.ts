import { CoreMessage, CoreTool, LanguageModel, ToolInvocation } from 'ai';
import { AiAgentSOPNode, IAiAgentSOPNodeOptions } from '~shared/agent/AiAgentSOPNode';
import { BaseAgentNodeBuilder } from '~shared/agent/builders/BaseAgentNodeBuilder';
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

  public withSOP(sop: AiAgentSOP): this {
    this.options.sop = sop;
    return this;
  }
}
