import { z } from 'zod';
import { ContentWorkerMessageSchema } from '~shared/injection/ContentWorkerMessage';
import { SandboxMessageResponseSchema, SandboxMessageSchema } from '~shared/messaging/sandbox/types';
import { RuntimeMessageSchema } from '~shared/messaging/types';

export enum SandboxEventType {
  // from forwarder to sandbox
  INBOUND = 'sandbox-inbound',
  INBOUND_RESPONSE = 'sandbox-inbound-response',

  // from sandbox to forwarder
  OUTBOUND = 'sandbox-outbound',
  OUTBOUND_RESPONSE = 'sandbox-outbound-response',
}
export enum SandboxOutboundTarget {
  CONTENT = 'content',
  SERVICE = 'service',
}
export const SandboxWindowEventSource = 'aident-ai';
export const SandboxWindowEventSchema = z
  .object({
    id: z.string().uuid(),
    type: z.literal(SandboxEventType.INBOUND),
    message: SandboxMessageSchema,
    sender: z.any(),
  })
  .or(
    z.object({
      id: z.string().uuid(),
      type: z.literal(SandboxEventType.INBOUND_RESPONSE),
      response: SandboxMessageResponseSchema,
    }),
  )
  .or(
    z.object({
      id: z.string().uuid(),
      type: z.literal(SandboxEventType.OUTBOUND),
      target: z.literal(SandboxOutboundTarget.SERVICE),
      message: RuntimeMessageSchema,
    }),
  )
  .or(
    z.object({
      id: z.string().uuid(),
      type: z.literal(SandboxEventType.OUTBOUND),
      target: z.literal(SandboxOutboundTarget.CONTENT),
      tabId: z.number(),
      message: ContentWorkerMessageSchema,
    }),
  )
  .or(
    z.object({
      id: z.string().uuid(),
      type: z.literal(SandboxEventType.OUTBOUND_RESPONSE),
      response: z.any(),
    }),
  );
export type SandboxWindowEvent = z.infer<typeof SandboxWindowEventSchema>;
