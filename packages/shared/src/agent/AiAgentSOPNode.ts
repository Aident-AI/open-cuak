import { CoreMessage, CoreTool, DataStreamWriter, LanguageModel, ToolInvocation } from 'ai';
import { AgentRunResult } from '~shared/agent/AgentRunResult';
import { AiAgentNode, IAiAgentInspectionConfig } from '~shared/agent/AiAgentNode';
import { IBaseAgentNodeOptions } from '~shared/export-map.generated';
import { ALogger } from '~shared/logging/ALogger';
import { AiAgentSOP, AiAgentSOPRunState } from '~shared/sop/AiAgentSOP';

export interface IAiAgentSOPNodeOptions
  extends IBaseAgentNodeOptions<CoreMessage, LanguageModel, CoreTool, ToolInvocation> {
  dataStream?: DataStreamWriter;
  inspectionConfig?: IAiAgentInspectionConfig;
  sop: AiAgentSOP;
}

export class AiAgentSOPNode extends AiAgentNode {
  // loop through sop steps
  public async genRunSOP(): Promise<AgentRunResult> {
    if (!this.sopRunState) throw new Error('SOP is not set, please set it using the withSOP method');
    let runResult: AgentRunResult | undefined = undefined;
    while (this.sopRunState.currentStepIndex < this.sopRunState.sop.steps.length) {
      ALogger.info({ context: 'Running SOP step', stepIndex: this.sopRunState.currentStepIndex });
      const step = this.sopRunState.sop.steps[this.sopRunState.currentStepIndex];
      // sanity check
      if (this.sopRunState.currentStepIndex + 1 !== step.id)
        throw new Error(`Step ID mismatch: ${this.sopRunState.currentStepIndex + 1} !== ${step.id}`);

      const message = [{ role: 'user', content: step.action }] as CoreMessage[];

      if (this.sopRunState.currentStepIndex > 0) this.resetBeforeSOPStep();
      runResult = await this.genRun(message);

      // TODO re-run the failed step
      if (!runResult.success) throw new Error(`Step ${step.id} failed`);
      this.sopRunState.currentStepIndex++;
    }
    return runResult!;
  }

  public resetBeforeSOPStep(): void {
    this.setState({
      runResult: undefined,
      stepCount: 0,
      stepEnvStateHistory: [],
      stepHistory: [],
    });
  }

  public sopRunState: AiAgentSOPRunState;

  constructor(options: IAiAgentSOPNodeOptions) {
    super(options);
    this.sopRunState = { sop: options.sop, currentStepIndex: 0 };
  }
}
