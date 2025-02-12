import { z } from 'zod';
import { FunctionCallParameterSchema } from '~shared/function-call/types';

export const ShareGPTMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool_call', 'tool_response']).describe('The role of message sender.'),
  content: z.string().describe('The content of the message.'),
});
export type ShareGPTMessage = z.infer<typeof ShareGPTMessageSchema>;

export const ShareGPTToolSchema = z.object({
  name: z.string().describe('The name of the tool.'),
  description: z.string().describe('The description of the tool.'),
  parameters: FunctionCallParameterSchema,
});
export type ShareGPTTool = z.infer<typeof ShareGPTToolSchema>;

export const ShareGPTDataSchema = z.object({
  conversations: z
    .array(ShareGPTMessageSchema)
    .describe('The messages in the chat history as the main data to train on.'),
  tools: z.string().describe('The json string of the tools to be used in the chat context.'),
  images: z
    .array(z.string())
    .optional()
    .describe(
      'The url/file-path for the images assets to send along with the messages. This length should match the number of <images> tags in the messages.',
    ),
  videos: z
    .array(z.string())
    .optional()
    .describe(
      'The url/file-path for the video assets to send along with the messages. This length should match the number of <video> tags in the messages.',
    ),
});
export type ShareGPTData = z.infer<typeof ShareGPTDataSchema>;
