import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class QueryTabs_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.QUERY_TABS;

  public static description = undefined;

  public static requestPayloadSchema = z
    .object({
      active: z.boolean().optional().describe('Whether the tabs are active in their windows.'),
      currentWindow: z.boolean().optional().describe('Whether the tabs are in the current window.'),
      highlighted: z.boolean().optional().describe('Whether the tabs are highlighted.'),
      lastFocusedWindow: z.boolean().optional().describe('Whether the tabs are in the last focused window.'),
      status: z.enum(['loading', 'complete']).optional().describe('The tab loading status'),
      title: z.string().optional().describe('Match page titles against a pattern.'),
      url: z
        .string()
        .optional()
        .describe('Match tabs against one or more URL patterns (e.g. https://*.google.com/foo*bar).'),
      windowId: z
        .number()
        .optional()
        .describe('The ID of the parent window, or `windows.WINDOW_ID_CURRENT` for the current window.'),
    })
    .describe('The query info to filter tabs. All tabs if no properties are specified');

  public static responsePayloadSchema = z.array(ChromeTabSchema);

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    try {
      if (!chrome?.tabs) throw new Error('chrome.tabs is not available');
      return await chrome.tabs.query(payload ?? {});
    } catch (e) {
      throw new Error(`Failed to query tabs: ${(e as Error).message}`);
    }
  }
}

enforceBaseActionConfigStatic(QueryTabs_ActionConfig);
