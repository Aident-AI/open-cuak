import { z } from 'zod';
import { WindowSchema } from '~shared/chrome/Window';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class OpenNewWindow_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.OPEN_NEW_WINDOW;

  public static description = undefined;

  public static requestPayloadSchema = z.object({
    focused: z.boolean().optional().describe('If true, opens an active window. If false, opens an inactive window.'),
    incognito: z.boolean().optional().describe('Whether the new window should be an incognito window.'),
    state: z
      .enum(['normal', 'minimized', 'maximized', 'fullscreen'])
      .optional()
      .describe(
        'The initial state of the window. The minimized, maximized, and fullscreen states cannot be combined with left, top, width, or height.',
      ),
    tabId: z.number().optional().describe('The ID of the tab for which you want to adopt to the new window.'),
    type: z.enum(['normal', 'popup', 'panel']).optional().describe('Specifies what type of browser window to create.'),
    url: z.string().url().optional().describe('The URL to navigate the tab to initially.'),

    // position and size
    height: z.number().optional().describe('The height in pixels of the new window. Defaults to a natural height.'),
    width: z.number().optional().describe('The width in pixels of the new window. Defaults to a natural width.'),
    left: z
      .number()
      .optional()
      .describe(
        'The number of pixels to position the new window from the left edge of the screen. If not specified, the new window is offset naturally from the last focused window.',
      ),
    top: z
      .number()
      .optional()
      .describe(
        'The number of pixels to position the new window from the top edge of the screen. If not specified, the new window is offset naturally from the last focused window.',
      ),
  });

  public static responsePayloadSchema = WindowSchema;

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    if (!chrome?.tabs) throw new Error('chrome.tabs is not available');
    return await chrome.windows.create(payload ?? {});
  }
}

enforceBaseActionConfigStatic(OpenNewWindow_ActionConfig);
