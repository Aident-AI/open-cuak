import { z } from 'zod';
import { RegisteredToolSetName } from '~shared/agent/RegisteredToolSetName';
import { RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';

export const ShadowModeWorkflowEnvironmentSchema = z.object({
  startPosition: RemoteCursorPositionSchema.describe('The start position of the workflow.'),
  startUrl: z.string().url().describe('The URL to start the workflow.'),
  viewport: z
    .object({ width: z.number(), height: z.number() })
    .optional()
    .describe('The viewport to use in the workflow.'),
  toolset: z.nativeEnum(RegisteredToolSetName).describe('The name of the toolset to be used in the workflow.'),
  systemPrompts: z.array(z.any().describe('The system prompts to send along with the workflow.')).optional(),
  stepStateInstructions: z
    .array(z.any().describe('The step state instructions to send along with the workflow.'))
    .optional(),
});
export type ShadowModeWorkflowEnvironment = z.infer<typeof ShadowModeWorkflowEnvironmentSchema>;
