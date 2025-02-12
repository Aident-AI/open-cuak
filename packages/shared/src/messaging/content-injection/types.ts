import z from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';

export enum ContentInjectionMessageAction {
  DEBUGGER_COPY_NANOID_TO_CLIPBOARD = 'debugger:copy-nanoid-to-clipboard',
  PING = 'ping',
  RRWEB_FETCH_SNAPSHOT = 'rrweb:fetch-snapshot',
}

export const ContentInjectionMessageSchema = z.object({
  receiver: z.literal(RuntimeMessageReceiver.CONTENT_INJECTION),
  action: z.nativeEnum(ContentInjectionMessageAction),
  payload: z.any().optional(),
});
export type ContentInjectionMessage = z.infer<typeof ContentInjectionMessageSchema>;
