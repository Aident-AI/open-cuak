import z from 'zod';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';

export enum SidePanelMessageAction {
  PING = 'ping',

  // replayer
  LIVE_REPLAYER_APPEND_EVENT = 'live-replayer:append-event',
  LIVE_REPLAYER_FETCH_SNAPSHOT = 'live-replayer:fetch-snapshot',
  SESSION_REPLAYER_GENERATE_SHADOW_MODE_EVENTS = 'session-replayer:generate-shadow-mode-events',
}

export const SidePanelMessageSchema = z.object({
  receiver: z.literal(RuntimeMessageReceiver.SIDE_PANEL),
  action: z.nativeEnum(SidePanelMessageAction),
  payload: z.any().optional(),
});
export type SidePanelMessage = z.infer<typeof SidePanelMessageSchema>;
