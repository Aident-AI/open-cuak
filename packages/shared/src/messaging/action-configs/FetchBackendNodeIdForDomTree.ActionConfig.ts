import { ElementHandle } from 'puppeteer-core';
import { z } from 'zod';
import { ActionConfigAutoAttachesToInteractable } from '~shared/decorators/ActionConfigAutoAttachesToInteractable';
import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { ALogger } from '~shared/logging/ALogger';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { WaitUtils } from '~shared/utils/WaitUtils';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';
export const DOM_KEY_FOR_BACKEND_NODE_ID = 'data-backend-node-id';
const TIMEOUT_IN_MS = 30_000;

export class FetchBackendNodeIdForDomTree_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_BACKEND_NODE_ID_FOR_DOM_TREE;

  public static description = 'Set data-backend-node-id attribute for all dom elements that do not have it yet.';

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = z.void();

  @ActionConfigAutoAttachesToInteractable
  public static async exec(
    _payload: z.infer<typeof this.requestPayloadSchema>,
    context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const activeTabLifecycle = context.getActiveTabLifecycleService();
    const startTime = Date.now();

    if (this.#isExecReadyTabStatus(activeTabLifecycle.getStatus())) {
      await this.execWhenDomComplete(context, startTime);
    } else {
      void activeTabLifecycle.waitUntilStatus(TabLifecycleStatus.DOM_COMPLETE, async () => {
        await this.execWhenDomComplete(context, startTime);
      });
    }
  }

  public static async execWhenDomComplete(context: IActionConfigExecContext, startTime: number): Promise<void> {
    if (this.#running > 0 && Date.now() - this.#running < TIMEOUT_IN_MS) {
      this.#shouldReload = true;
      return;
    }
    this.#running = Date.now();

    const activeTabLifecycle = context.getActiveTabLifecycleService();
    const tabStatus = activeTabLifecycle.getStatus();
    if (!this.#isExecReadyTabStatus(tabStatus))
      throw new Error('Tab status is not ready for execution. status=' + tabStatus);

    const its = context.getInteractableService();
    await WaitUtils.waitUntil(
      () => {
        try {
          its.getPageOrThrow();
          return true;
        } catch (e) {
          return false;
        }
      },
      { timeout: 10_000 },
    );
    const elements = await its.getPageOrThrow().$$('*:not([data-backend-node-id])');
    ALogger.info({ context: 'found ' + elements.length + ' elements', stack: 'FetchBackendNodeIdForDomTree' });

    const handleElement = async (e: ElementHandle<Element>): Promise<void> => {
      const objectId = e.remoteObject().objectId;
      if (!objectId) throw new Error('objectId not found for element');
      const rsp = (await its.sendCdpCommand('DOM.describeNode', { objectId })) as object;
      const node = 'node' in rsp ? (rsp.node as object) : null;
      if (!node) throw new Error('Node not found for objectId ' + objectId);
      if (!('backendNodeId' in node) || !node.backendNodeId)
        throw new Error('backendNodeId not found for node ' + JSON.stringify(node));

      const k = DOM_KEY_FOR_BACKEND_NODE_ID;
      const v = node.backendNodeId;
      await e.evaluate((el, k, v) => el.setAttribute(k, v.toString()), k, v);
    };
    await Promise.all(elements.map(handleElement));

    await activeTabLifecycle.updateStatus(TabLifecycleStatus.SHADOW_MODE_READY);
    this.resetRunningStatus();
    ALogger.info({ context: 'completed in ' + (Date.now() - startTime) + 'ms', stack: 'FetchBackendNodeIdForDomTree' });

    // refresh if needed
    if (this.#shouldReload) {
      this.#shouldReload = false;
      this.execWhenDomComplete(context, Date.now()); // non-blocking
    }
  }

  public static resetRunningStatus(): void {
    this.#running = -1;
  }

  static #running: number = -1;
  static #shouldReload = false;
  static readonly #execReadyTabStatus = new Set([
    TabLifecycleStatus.DOM_COMPLETE,
    TabLifecycleStatus.SHADOW_MODE_READY,
  ]);

  static #isExecReadyTabStatus(status: TabLifecycleStatus): boolean {
    return this.#execReadyTabStatus.has(status);
  }
}

enforceBaseActionConfigStatic(FetchBackendNodeIdForDomTree_ActionConfig);
