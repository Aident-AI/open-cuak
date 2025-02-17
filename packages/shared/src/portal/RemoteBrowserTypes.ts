import { z } from 'zod';

export const RemoteCursorPositionSchema = z.object({
  cursor: z.string(),
  tabId: z.number(),
  ts: z.number(),
  x: z.number(),
  y: z.number(),
  event: z.string(),
});
export type RemoteCursorPosition = z.infer<typeof RemoteCursorPositionSchema>;

export const RemoteBrowserTabSchema = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
});
export type RemoteBrowserTab = z.infer<typeof RemoteBrowserTabSchema>;
