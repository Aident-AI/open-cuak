import { z } from 'zod';
import { WindowSchema } from '~shared/chrome/Window';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class HighlightTabs_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.HIGHLIGHT_TABS;

  public static description = 'Highlight tabs. Will appear to do nothing if the specified tab is currently active.';

  public static requestPayloadSchema = z.object({
    tabs: z.array(z.number()).describe('One or more tab indices to highlight.'),
    windowId: z.number().optional().describe('The window that contains the tabs.'),
  });

  public static responsePayloadSchema = WindowSchema.describe(
    'Details about the window whose tabs were highlighted.',
  ).optional();

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    if (!chrome?.tabs) throw new Error('chrome.tabs is not available');
    if (payload.tabs.length < 1) return;
    return await chrome.tabs.highlight(payload);
  }
}

enforceBaseActionConfigStatic(HighlightTabs_ActionConfig);
