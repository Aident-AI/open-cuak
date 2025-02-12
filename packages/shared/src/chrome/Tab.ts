import { z } from 'zod';

export type ChromeTab = chrome.tabs.Tab & { id: number };

export const ChromeTabSchema = z.object({
  active: z.boolean(),
  audible: z.boolean().optional().describe('Whether the tab is making sounds.'),
  autoDiscardable: z
    .boolean()
    .describe('Whether the tab can be discarded automatically by the browser when resources are low.'),
  discarded: z.boolean().describe('Whether the tab has been discarded.'),
  favIconUrl: z.string().optional(),
  groupId: z.number().describe('The ID of the group that the tab belongs to.'),
  height: z.number().optional().describe('The height of the tab in pixels.'),
  highlighted: z.boolean(),
  id: z.number().optional(),
  incognito: z.boolean().describe('Whether the tab is in an incognito window.'),
  index: z.number().describe('The zero-based index of the tab within its window.'),
  mutedInfo: z
    .object({
      muted: z
        .boolean()
        .describe("Whether the tab is prevented from playing sound (but hasn't necessarily recently produced sound)."),
      reason: z.string().optional().describe('The reason the tab was muted or unmuted.'),
      extensionId: z
        .string()
        .optional()
        .describe(
          'The ID of the extension that muted the tab, if any. One of: "user", "capture", "extension", "system"',
        ),
    })
    .optional()
    .describe('Current tab muted state and the reason for the last state change.'),
  openerTabId: z.number().optional().describe('The ID of the tab that opened this tab, if any.'),
  pendingUrl: z.string().optional().describe('The URL the tab is navigating to, before it has committed.'),
  pinned: z.boolean(),
  selected: z.boolean(),
  sessionId: z.string().optional().describe('The session ID used to uniquely identify a Tab.'),
  status: z.string().optional().describe('The tab loading status. One of: "loading", "complete"'),
  title: z.string().optional(),
  url: z.string().optional().describe('The URL the tab is displaying.'),
  width: z.number().optional().describe('The width of the tab in pixels.'),
  windowId: z.number(),
});

export const toChromeTabOrThrow = (tab?: chrome.tabs.Tab | null): ChromeTab => {
  if (!tab) throw new Error('no tab found');
  if (!tab.id) throw new Error('no tab id found');
  return tab as ChromeTab;
};

export const isChromeInternalPageTab = (tab: ChromeTab): boolean => {
  return (
    tab.url?.startsWith('chrome://') ||
    tab.pendingUrl?.startsWith('chrome://') ||
    (tab.url ?? '').length < 1 ||
    tab.url === 'about:blank'
  );
};
