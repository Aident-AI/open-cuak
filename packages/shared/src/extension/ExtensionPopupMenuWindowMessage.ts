import { ZodSchema, z } from 'zod';

export const ExtensionPopupMenuWindowMessageOrigin = 'aident-extension:popup-menu';

// inbound in the perspective of the popup-menu component
export enum ExtensionPopupMenuInboundEvent {
  SELECTED_TEXT = 'selected-text',
  UPDATE_SESSION = 'update-session',
  RESET_STATES = 'reset-states',
}

export enum ExtensionPopupMenuOutboundEvent {
  ADJUST_STYLE = 'adjust-style',
  CLOSE_POPUP = 'close-popup',
  COMPONENT_READY = 'component-ready',
}

export const ExtensionPopupMenuEventContentSchema = {
  // inbound
  [ExtensionPopupMenuInboundEvent.SELECTED_TEXT]: z.object({ text: z.string() }),
  [ExtensionPopupMenuInboundEvent.UPDATE_SESSION]: z.object({ session: z.any() }),
  [ExtensionPopupMenuInboundEvent.RESET_STATES]: z.void(),

  // outbound
  [ExtensionPopupMenuOutboundEvent.ADJUST_STYLE]: z.object({
    width: z.number(),
    height: z.number(),
    borderRadius: z.string().optional(),
  }),
  [ExtensionPopupMenuOutboundEvent.CLOSE_POPUP]: z.void(),
  [ExtensionPopupMenuOutboundEvent.COMPONENT_READY]: z.void(),
} as Record<ExtensionPopupMenuInboundEvent | ExtensionPopupMenuOutboundEvent, ZodSchema>;

export const ExtensionPopupMenuInboundMessageSchema = z
  .object({
    origin: z.literal(ExtensionPopupMenuWindowMessageOrigin),
    direction: z.literal('inbound'),
    type: z.nativeEnum(ExtensionPopupMenuInboundEvent),
    content: z.any(),
  })
  .refine(
    (data) => {
      const eventType = data?.type;
      const eventContentSchema = ExtensionPopupMenuEventContentSchema[eventType];
      return eventContentSchema ? eventContentSchema.safeParse(data?.content).success : false;
    },
    { message: 'Invalid content for the given inbound event type', path: ['content'] },
  );
export type ExtensionPopupMenuInboundMessage = z.infer<typeof ExtensionPopupMenuInboundMessageSchema>;

export const ExtensionPopupMenuOutboundMessageSchema = z
  .object({
    origin: z.literal(ExtensionPopupMenuWindowMessageOrigin),
    direction: z.literal('outbound'),
    type: z.nativeEnum(ExtensionPopupMenuOutboundEvent),
    content: z.any(),
  })
  .refine(
    (data) => {
      const eventType = data?.type;
      const eventContentSchema = ExtensionPopupMenuEventContentSchema[eventType];
      return eventContentSchema ? eventContentSchema.safeParse(data?.content).success : false;
    },
    { message: 'Invalid content for the given outbound event type', path: ['content'] },
  );
export type ExtensionPopupMenuOutboundMessage = z.infer<typeof ExtensionPopupMenuOutboundMessageSchema>;
