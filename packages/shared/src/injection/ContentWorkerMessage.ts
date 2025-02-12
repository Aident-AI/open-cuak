import z from 'zod';
import { TabMessageType } from '~shared/chrome/messaging/sendTabMessage';

export enum ContentWorkerMessageAction {
  SEND_CHAT_GPT_MESSAGE = 'send-chat-gpt-message',
}

export const ContentWorkerMessageSchema = z.object({
  type: z.literal(TabMessageType.CONTENT),
  action: z.nativeEnum(ContentWorkerMessageAction),
  payload: z.any(),
});
export type ContentWorkerMessage = z.infer<typeof ContentWorkerMessageSchema>;
