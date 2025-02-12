import { oneLine } from 'common-tags';
import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export enum PageLoadState {
  LOADING = 'loading',
  INTERACTIVE = 'interactive',
  READY = 'ready',
  COMPLETE = 'complete',
}

export class WaitForPage_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.WAIT_FOR_PAGE;

  public static description = `Wait for the page to be fully loaded, for interactive or others.`;

  public static requestPayloadSchema = z.object({
    expectedState: z.nativeEnum(PageLoadState).optional().describe(oneLine`
      The expected state of the page to wait for. Defaulting to 'complete'. 'interactive' means the page has loaded
      enough to be interactive, 'complete' means the page has fully loaded.
    `),
  });

  public static responsePayloadSchema = z.void();

  @ActionConfigAutoAttachesToInteractable // TODO: separate interactable-service attachment and fetching snapshot
  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const page = context.getInteractableService().getPageOrThrow();
    switch (payload.expectedState) {
      case PageLoadState.LOADING:
        await page.waitForFunction(() => document.readyState === 'loading');
        break;
      case PageLoadState.INTERACTIVE:
        await page.waitForFunction(() => document.readyState === 'interactive');
        break;
      case PageLoadState.READY:
        await page.waitForFunction(() => document.readyState === 'complete');
        break;
      case PageLoadState.COMPLETE:
      default:
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }
  }
}

enforceBaseActionConfigStatic(WaitForPage_ActionConfig);
