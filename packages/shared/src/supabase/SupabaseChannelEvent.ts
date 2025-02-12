import z from 'zod';
import { RuntimeMessageResponseSchema, RuntimeMessageSchema } from '~shared/messaging/types';

export const EVENT_CHANNEL_NAME_PREFIX = 'extension-event:';

export namespace SupabaseChannelEvent {
  export const AckSchema = z.object({
    type: z.literal('broadcast'),
    event: z.string().startsWith('ack:'),
    eventId: z.string().uuid(),
  });
  export type Ack = z.infer<typeof AckSchema>;

  export namespace RuntimeMessage {
    export const RequestSchema = z.object({
      type: z.literal('broadcast'),
      event: z.literal('broadcast'),
      eventId: z.string().uuid(),
      payload: RuntimeMessageSchema,
      expectResponse: z.boolean().default(false),
    });
    export type Request = z.infer<typeof RequestSchema>;

    export const ResponseSchema = z.object({
      type: z.literal('broadcast'),
      event: z.string().startsWith('response:'),
      eventId: z.string().uuid(),
      payload: RuntimeMessageResponseSchema,
    });
    export type Response = z.infer<typeof ResponseSchema>;
  }
}

export const SupabaseChannelEventSchema = SupabaseChannelEvent.AckSchema.or(
  SupabaseChannelEvent.RuntimeMessage.RequestSchema,
).or(SupabaseChannelEvent.RuntimeMessage.ResponseSchema);
export type SupabaseChannelEvent = z.infer<typeof SupabaseChannelEventSchema>;
