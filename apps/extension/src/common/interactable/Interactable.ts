import { ElementHandle } from 'puppeteer-core';
import { InteractableRefreshedValue } from '~shared/broadcast/InteractableRefreshedValueSchema';
import { BroadcastEventType } from '~shared/broadcast/types';
import { ChromeTab } from '~shared/chrome/Tab';
import { IInteractable } from '~shared/interactable/IInteractable';
import { DummyTab, InteractableDomImpl } from '~shared/interactable/InteractableDomImpl';
import { InteractableNodeImpl } from '~shared/interactable/InteractableNodeImpl';
import { InteractableInteractionRegistry } from '~shared/interactable/interactions/InteractableInteractionRegistry';
import { INodeId, PaginatedInteractableNodeTree, SNAPSHOT_NANOID_ATTRIBUTE_KEY } from '~shared/interactable/types';
import { ALogger } from '~shared/logging/ALogger';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { AutoAttachToInteractableService } from '~src/common/decorators/AutoAttachToInteractableService';
import { InteractableService } from '~src/common/interactable/InteractableService';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';
import { ActionConfigExecContext } from '~src/scripts/service-worker/ActionConfigExecContext';

import type { serializedNodeWithId } from 'rrweb-snapshot/typings/types';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Interactable {
  export class Dom extends InteractableDomImpl implements IInteractable.Dom {
    public static async createForActiveTab(snapshot: serializedNodeWithId): Promise<Interactable.Dom> {
      const tab = await ActiveTabService.fetch();
      const itImpl = await this.genCreateForTab(snapshot, tab);
      if (itImpl.isLoading()) throw new Error('Interactable.Dom is still loading');
      const it = new Interactable.Dom(itImpl.snapshot, itImpl.tab, itImpl.root, itImpl.dict, false);
      if (tab.id !== DummyTab.id) this._publishRefreshedEvent(it.tab.title, it.tab.id, it.updatedAt, it.uuid);
      return it;
    }

    public static async createForDummy(snapshot: serializedNodeWithId): Promise<Interactable.Dom> {
      const it = await this.genCreateForTab(snapshot, DummyTab);
      return it as Interactable.Dom;
    }

    private static _publishRefreshedEvent(
      tabTitle: string | undefined,
      tabId: number,
      updatedAt: number,
      uuid: string,
    ): void {
      const event = { type: BroadcastEventType.INTERACTABLE_REFRESHED, identifier: tabId };
      BroadcastService.send(event, { updatedAt, uuid } as InteractableRefreshedValue); // non-blocking
      ALogger.info({ context: 'Refreshed', stack: 'Interactable', tabTitle, tabId, updatedAt, uuid });
    }

    // overrides
    public constructor(
      snapshot: serializedNodeWithId,
      tab: ChromeTab,
      root: IInteractable.Node | null,
      rrNodeDict: Record<INodeId, IInteractable.Node>,
      isLoading: boolean = true,
    ) {
      super(snapshot, tab, root, rrNodeDict, isLoading);
    }

    public override async refresh(expiryInMs: number = 300): Promise<void> {
      if (this.isLoading()) {
        ALogger.warn({ context: 'Refreshing already in progress', stack: 'Interactable', tabId: this.tab.id });
        return;
      }
      const now = Date.now();
      if (this.updatedAt >= now - expiryInMs) {
        ALogger.warn({ context: 'Still refresh', stack: 'Interactable', updatedAt: this.updatedAt, now, expiryInMs });
        return;
      }

      this.setIsLoading(true);
      const it = await InteractableService.fetchInteractable();
      this.overrideValues(it);
      Interactable.Dom._publishRefreshedEvent(this.tab.title, this.tab.id, this.updatedAt, this.uuid);
      this.setIsLoading(false);
    }

    public async fetchPaginatedTreeByCursor(cursorId: string): Promise<PaginatedInteractableNodeTree | undefined> {
      const key = { type: BroadcastEventType.PAGINATION_CURSOR_UPDATED, identifier: cursorId };
      return await BroadcastService.fetch<PaginatedInteractableNodeTree>(key);
    }
  }

  export class Node extends InteractableNodeImpl implements IInteractable.Node {
    @AutoAttachToInteractableService
    public override async fetchHandleOrThrow(): Promise<ElementHandle> {
      const page = InteractableService.getPageOrThrow();
      const data = { k: SNAPSHOT_NANOID_ATTRIBUTE_KEY, v: this.iNodeId };
      const handle = await page.evaluateHandle(({ k, v }) => document.querySelector(`[${k}="${v}"]`), data);
      const elementHandle = (handle?.asElement() as ElementHandle) ?? null;
      if (!elementHandle) throw new Error('ElementHandle not found for nodeId: ' + this.iNodeId);
      return elementHandle;
    }

    @AutoAttachToInteractableService
    public override async performInteraction(action: InteractableInteraction, config?: unknown): Promise<void> {
      try {
        const handle = await this.fetchHandleOrThrow();
        const interactionClass = InteractableInteractionRegistry[action];
        let interactionConfig;
        if (!config || Object.keys(config).length < 1) interactionConfig = undefined;
        else {
          const parsingResult = interactionClass.configSchema.safeParse(config);
          if (!parsingResult.success)
            throw new Error(
              'Invalid interaction config. Please follow the config schema: ' +
                JSON.stringify(interactionClass.getConfigJsonSchema()),
            );
          interactionConfig = parsingResult.data;
        }
        const interaction = new interactionClass(this, handle);
        const context = ActionConfigExecContext.instance;
        await interaction.exec(interactionConfig, context);
      } catch (error) {
        ALogger.error({ stack: 'performInteraction', error });
        throw error;
      }
    }
  }
}
