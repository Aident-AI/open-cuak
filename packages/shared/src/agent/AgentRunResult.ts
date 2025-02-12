import { z } from 'zod';

export const AgentRunResultSchema = z.object({
  success: z.boolean().describe('Whether the task was successful.'),
  error: z.any().describe('The error message if the task was not successful.').optional(),
  finalResult: z.any().describe('The message to user as the final result of the task.').optional(),
});

export type AgentRunResult = z.infer<typeof AgentRunResultSchema>;
