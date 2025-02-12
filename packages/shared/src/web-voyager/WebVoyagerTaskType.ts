import { z } from 'zod';

export const WebVoyagerTaskSchema = z.object({
  web_name: z.string(),
  id: z.string(),
  ques: z.string(),
  web: z.string(),
});
export type WebVoyagerTask = z.infer<typeof WebVoyagerTaskSchema>;
