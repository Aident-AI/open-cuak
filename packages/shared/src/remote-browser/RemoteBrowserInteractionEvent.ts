import { z } from 'zod';
import { RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';

export const RemoteBrowserInteractionEventSchema = z
  .object({
    type: z.literal('mouse'),
    data: z.object({
      sessionId: z.string(),
      position: RemoteCursorPositionSchema,
    }),
    ts: z.number(),
  })
  .or(
    z.object({
      type: z.literal('keyboard'),
      data: z.object({
        sessionId: z.string(),
        event: z.string(),
        key: z.string(),
      }),
      ts: z.number(),
    }),
  )
  .or(
    z.object({
      type: z.literal('wheel'),
      data: z.object({
        sessionId: z.string(),
        deltaX: z.number(),
        deltaY: z.number(),
      }),
      ts: z.number(),
    }),
  );
export type RemoteBrowserInteractionEvent = z.infer<typeof RemoteBrowserInteractionEventSchema>;
