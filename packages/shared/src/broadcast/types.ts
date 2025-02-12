import { z } from 'zod';

export enum BroadcastEventType {
  ACTIVE_TAB_UPDATED = 'active-tab-updated',
  APP_SETTING_UPDATED = 'app-setting-updated',
  CHATGPT_TAB_OPENED = 'chatgpt-tab-opened',
  EXEC_SESSION_ID = 'exec-session-id',
  LIVE_RECORDING_EVENT_RECEIVED = 'live-recording-event-received',
  MANAGED_WINDOWS_UPDATED = 'managed-windows-updated',
  MOUSE_POSITION_UPDATED = 'mouse-position-updated',
  ON_REMOTE_CONNECTION_ATTACHED = 'on-remote-connection-attached',
  PAGINATION_CURSOR_UPDATED = 'pagination-cursor-updated',
  POPUP_REDIRECT = 'popup-redirect',
  SERVICE_WORKER_READY = 'service-worker-ready',
  TAB_INJECTION_STATUS = 'tab-injection-status',
  USER_SESSION_UPDATED = 'user-session-updated',

  // Interactable
  INTERACTABLE_REFRESHED = 'interactable-refreshed',
  INTERACTABLE_SERVICE_ATTACHED = 'interactable-service-attached',

  // Shadow Mode
  SHADOW_EVENT_APPENDED = 'shadow-event-appended',
  SHADOW_MODE_SESSION_UPDATED = 'shadow-mode-session-updated',
}

export const BroadcastEventSchema = z.object({
  type: z.nativeEnum(BroadcastEventType),
  identifier: z.string().or(z.number()).optional(),
});
export type BroadcastEvent = z.infer<typeof BroadcastEventSchema>;

export const BroadcastEventMessageSchema = z.object({
  event: BroadcastEventSchema,
  value: z.any().optional(),
  oldValue: z.any().optional(),
});
export type BroadcastEventMessage = z.infer<typeof BroadcastEventMessageSchema>;
