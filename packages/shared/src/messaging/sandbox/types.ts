import { z } from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';

export enum SandboxMessageType {
  CREATE_FUNCTION = 'create-function',
  INVOKE_FUNCTION = 'invoke-function',

  // CDP Service
  CDP_ON_DETACH = 'cdp-on-detach',
  CDP_ON_EVENT = 'cdp-on-event',
}

export const SandboxMessageSchema = z.object({
  receiver: z.literal(RuntimeMessageReceiver.SANDBOX),
  action: z.nativeEnum(SandboxMessageType),
  payload: z.any().optional(),
});
export type SandboxMessage = z.infer<typeof SandboxMessageSchema>;

export const SandboxMessageResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.any().optional(),
  })
  .or(z.object({ success: z.literal(false), error: z.string() }));
export type SandboxMessageResponse = z.infer<typeof SandboxMessageResponseSchema>;
