import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { ALogger } from '~shared/logging/ALogger';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { PageNavigationAction } from '~shared/messaging/action-configs/page-actions/types';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';
export class NavigatePage_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.NAVIGATE_PAGE;

  public static description = `Navigate the page using allowed actions.`;

  public static requestPayloadSchema = z.object({
    action: z.nativeEnum(PageNavigationAction),
    url: z.string().optional().default('').describe('The target URL for the `goto` action.'),
  });

  public static responsePayloadSchema = z.void();

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const its = context.getInteractableService();
    const { action, url } = payload;
    switch (action) {
      case PageNavigationAction.GO_BACK:
        await its.getPageOrThrow().goBack();
        break;
      case PageNavigationAction.GO_FORWARD:
        await its.getPageOrThrow().goForward();
        break;
      case PageNavigationAction.GOTO: {
        if (!url) throw new Error(`Target url is not specified`);
        let target = url;
        if (!url.match(/^[a-zA-Z]+:\/\//)) {
          target = `https://${url}`;
        }
        const result = its.getPageCreationResult();
        if (!result.success || !result.page) await chrome.tabs.update(its.getActiveTab().id, { url: target });
        else await result.page.goto(target);
        ALogger.info({ context: 'Went to the page', url: target });

        break;
      }
      case PageNavigationAction.RELOAD:
        await its.getPageOrThrow().reload();
        break;
      default:
        throw new Error(`Invalid action ${action}`);
    }
  }
}

enforceBaseActionConfigStatic(NavigatePage_ActionConfig);
