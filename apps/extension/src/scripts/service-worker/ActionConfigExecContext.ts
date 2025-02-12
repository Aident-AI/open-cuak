import { SupabaseClient } from '@supabase/supabase-js';
import { BroadcastEvent } from '~shared/broadcast/types';
import { ChromeTab } from '~shared/chrome/Tab';
import { IInteractableServiceStatic } from '~shared/interactable/IInteractableServiceStatic';
import { IActiveTabLifecycleServiceStatic } from '~shared/services/IActiveTabLifecycleServiceStatic';
import { IRRReplayerWorkerServiceStatic } from '~shared/shadow-mode/IRRReplayerWorkerServiceStatic';
import { InteractableService } from '~src/common/interactable/InteractableService';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { SupabaseService } from '~src/common/services/SupabaseService';
import { RRReplayerWorkerService } from '~src/common/services/shadow-mode/RRReplayerWorkerService';
import { ShadowModeWorkerService } from '~src/common/services/shadow-mode/ShadowModeWorkerService';
import { ActiveTabLifecycleWorkerService } from '~src/common/services/tab/ActiveTabLifecycleWorkerService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class ActionConfigExecContext implements IActionConfigExecContext {
  public static get instance() {
    if (!this.#instance) this.#instance = new ActionConfigExecContext();
    return this.#instance;
  }

  static #instance: ActionConfigExecContext;

  public getInteractableService(): IInteractableServiceStatic {
    return InteractableService;
  }

  public getActiveTab(): ChromeTab {
    return ActiveTabService.getInServiceWorker() as ChromeTab;
  }

  public getBroadcastService() {
    return {
      send: <T>(event: BroadcastEvent, value?: T) => BroadcastService.send(event, value),
      fetch: <T>(event: BroadcastEvent) => BroadcastService.fetch(event) as T,
      subscribe: <T>(event: BroadcastEvent, callback: (newValue: T, oldValue?: T) => Promise<void> | void) =>
        BroadcastService.subscribe(event, callback),
      delete: (event: BroadcastEvent) => BroadcastService.delete(event),
    };
  }

  public getActiveTabLifecycleService(): IActiveTabLifecycleServiceStatic {
    return ActiveTabLifecycleWorkerService;
  }

  public getRRReplayerWorkerService(): IRRReplayerWorkerServiceStatic {
    return RRReplayerWorkerService;
  }

  public getSupabaseClient(): SupabaseClient {
    return SupabaseService.client;
  }

  public getShadowModeService() {
    return ShadowModeWorkerService;
  }
}
