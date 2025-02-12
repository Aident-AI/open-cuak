import { CoreMessage } from 'ai';
import { z } from 'zod';

export const AiMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().or(z.array(z.any())),
});
export type AiMessage = z.infer<typeof AiMessageSchema>;

export const parseCoreMessage = (messages: AiMessage[]): CoreMessage[] => messages as unknown as CoreMessage[];
