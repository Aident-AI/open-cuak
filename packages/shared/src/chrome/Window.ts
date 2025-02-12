import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';

export type ChromeWindow = chrome.windows.Window;

export const WindowSchema = z.object({
  alwaysOnTop: z.boolean(),
  focused: z.boolean().describe('Whether the window is currently the focused window.'),
  id: z.number().optional().describe('The ID of the window.'),
  incognito: z.boolean(),
  sessionId: z.string().optional().describe('The session ID used to uniquely identify a Window.'),
  state: z
    .enum(['normal', 'minimized', 'maximized', 'fullscreen', 'locked-fullscreen'])
    .optional()
    .describe('The state of this browser window.'),
  tabs: z
    .array(ChromeTabSchema)
    .optional()
    .describe('Array of tabs.Tab objects representing the current tabs in the window.'),
  type: z
    .enum(['normal', 'popup', 'panel', 'app', 'devtools'])
    .optional()
    .describe('The type of browser window this is.'),

  // position and size
  top: z.number().optional().describe('The offset of the window from the top edge of the screen in pixels.'),
  left: z.number().optional().describe('The offset of the window from the left edge of the screen in pixels.'),
  height: z.number().optional().describe('The height of the window, including the frame, in pixels.'),
  width: z.number().optional().describe('The width of the window, including the frame, in pixels.'),
});
