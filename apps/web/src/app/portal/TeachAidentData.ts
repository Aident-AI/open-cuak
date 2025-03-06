import { z } from 'zod';

export const TeachAidenDataSchema = z.object({
  screenshot: z.string(),
  event: z.string(),
});

export type TeachAidenData = z.infer<typeof TeachAidenDataSchema>;
