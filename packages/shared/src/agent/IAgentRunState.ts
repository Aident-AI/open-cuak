import { z } from 'zod';
import { AgentRunResult, AgentRunResultSchema } from '~shared/agent/AgentRunResult';
import { AiMessageSchema } from '~shared/agent/AiMessageSchema';

export interface IAgentRunState<Msg> {
  // input
  inputMessages: Msg[];
  systemMessages: Msg[];

  // historical context from previous agent runs, e.g. chat history
  chatHistory: Msg[];
  stepEnvStateHistory: Msg[][];

  // to limit the number of steps
  maxSteps: number;

  // state
  runResult: AgentRunResult | undefined;
  stepCount: number;
  stepHistory: (Msg & { stepNum?: number })[];
}

export const AiAgentRunStateSchema = z.object({
  inputMessages: z.array(AiMessageSchema),
  systemMessages: z.array(AiMessageSchema),
  chatHistory: z.array(AiMessageSchema),
  stepEnvStateHistory: z.array(z.array(AiMessageSchema)),
  maxSteps: z.number(),
  runResult: AgentRunResultSchema.optional(),
  stepCount: z.number(),
  stepHistory: z.array(z.object({ stepNum: z.number().optional() }).merge(AiMessageSchema)),
});
