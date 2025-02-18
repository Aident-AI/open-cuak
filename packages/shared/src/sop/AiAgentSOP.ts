import { z } from 'zod';

export const AiAgentSOPSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  steps: z.array(
    z.object({
      id: z.number(),
      action: z.string(),
      description: z.string().optional(),
      expectedStartState: z.string().optional(),
      expectedEndState: z.string().optional(),
    }),
  ),
});

export type AiAgentSOP = z.infer<typeof AiAgentSOPSchema>;

export interface AiAgentSOPRunState {
  sop: AiAgentSOP;
  currentStepIndex: number;
}
