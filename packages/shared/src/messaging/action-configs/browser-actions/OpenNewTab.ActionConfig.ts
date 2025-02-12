import { z } from 'zod';
import { ChromeTabSchema } from '~shared/chrome/Tab';
import { ALogger } from '~shared/logging/ALogger';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class OpenNewTab_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.OPEN_NEW_TAB;

  public static description = undefined;

  public static requestPayloadSchema = z.object({
    active: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether the tab should become the active tab in the window.'),
    pinned: z.boolean().optional().default(false).describe('Whether the tab should be pinned.'),
    url: z.string().url().optional().describe('The URL to navigate the tab to initially.'),
    waitForReady: z.boolean().optional().default(false).describe('Whether to wait until the tab is ready.'),
  });

  public static responsePayloadSchema = ChromeTabSchema;

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    if (!chrome?.tabs) throw new Error('chrome.tabs is not available');
    const { waitForReady, ...tabCreationConfig } = payload ?? {};
    const tab = await chrome.tabs.create(tabCreationConfig);
    if (waitForReady) {
      ALogger.info({ context: 'waiting for tab to be ready', tabId: tab.id });
      await context.getInteractableService().waitUntilInteractableReady();
      ALogger.info({ context: 'tab is ready', tabId: tab.id });
    }
    return tab;
  }
}

enforceBaseActionConfigStatic(OpenNewTab_ActionConfig);
