import { z } from 'zod';
import { AiToolCallSchema } from '~shared/agent/AiToolCallSchema';

export const VllmChatTemplateMessageTextContentSchema = z.object({ type: z.literal('text'), text: z.string() });
export type VllmChatTemplateMessageTextContent = z.infer<typeof VllmChatTemplateMessageTextContentSchema>;

export const VllmChatTemplateMessageImageContentSchema = z
  .object({ type: z.literal('image'), image: z.string() })
  .or(z.object({ type: z.literal('image'), image_url: z.string() }));
export type VllmChatTemplateMessageImageContent = z.infer<typeof VllmChatTemplateMessageImageContentSchema>;

export const VllmChatTemplateMessageVideoContentSchema = z.object({ type: z.literal('video'), video: z.any() });
export type VllmChatTemplateMessageVideoContent = z.infer<typeof VllmChatTemplateMessageVideoContentSchema>;

export const VllmChatTemplateUserMessageContentSchema = VllmChatTemplateMessageTextContentSchema.or(
  VllmChatTemplateMessageImageContentSchema,
).or(VllmChatTemplateMessageVideoContentSchema);
export type VllmChatTemplateUserMessageContent = z.infer<typeof VllmChatTemplateUserMessageContentSchema>;

export const VllmChatTemplateSystemMessageSchema = z.object({
  role: z.literal('system').or(z.literal('tool')),
  content: z.string(),
});
export type VllmChatTemplateSystemMessage = z.infer<typeof VllmChatTemplateSystemMessageSchema>;

export const VllmChatTemplateUserMessageSchema = z.object({
  role: z.literal('user'),
  content: z.string().or(z.array(VllmChatTemplateUserMessageContentSchema)),
});
export type VllmChatTemplateUserMessage = z.infer<typeof VllmChatTemplateUserMessageSchema>;

export const VllmChatTemplateAssistantMessageSchema = z.object({
  role: z.literal('assistant'),
  content: z.string().or(z.array(VllmChatTemplateMessageTextContentSchema)).optional(),
  tool_calls: z.array(AiToolCallSchema).optional(),
});
export type VllmChatTemplateAssistantMessage = z.infer<typeof VllmChatTemplateAssistantMessageSchema>;

export const VllmChatTemplateToolMessageSchema = z.object({
  role: z.literal('tool'),
  content: z.string(),
});
export type VllmChatTemplateToolMessage = z.infer<typeof VllmChatTemplateToolMessageSchema>;

export const VllmChatTemplateMessageSchema = VllmChatTemplateSystemMessageSchema.or(
  VllmChatTemplateAssistantMessageSchema,
)
  .or(VllmChatTemplateUserMessageSchema)
  .or(VllmChatTemplateToolMessageSchema);
export type VllmChatTemplateMessage = z.infer<typeof VllmChatTemplateMessageSchema>;

export const VllmChatTemplateDataSchema = z.object({
  model: z.string(),
  messages: z.array(VllmChatTemplateMessageSchema),
  tools: z.array(z.any()).optional(),
});
export type VllmChatTemplateData = z.infer<typeof VllmChatTemplateDataSchema>;
