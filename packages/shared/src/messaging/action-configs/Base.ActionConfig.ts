import { SupabaseClient } from '@supabase/supabase-js';
import { ZodSchema } from 'zod';
import { BroadcastEvent } from '~shared/broadcast/types';
import { ChromeTab } from '~shared/chrome/Tab';
import { IInteractableServiceStatic } from '~shared/interactable/IInteractableServiceStatic';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { IActiveTabLifecycleServiceStatic } from '~shared/services/IActiveTabLifecycleServiceStatic';
import { IRRReplayerWorkerServiceStatic } from '~shared/shadow-mode/IRRReplayerWorkerServiceStatic';
import { IShadowModeWorkerServiceStatic } from '~shared/shadow-mode/IShadowModeWorkerServiceStatic';

export interface IActionConfigExecContext {
  getInteractableService: () => IInteractableServiceStatic;
  getActiveTab: () => ChromeTab;
  getBroadcastService: () => {
    send: <T>(event: BroadcastEvent, value?: T) => Promise<void>;
    fetch: <T>(event: BroadcastEvent) => Promise<T | undefined>;
    subscribe: <T>(event: BroadcastEvent, callback: (newValue: T, oldValue?: T) => Promise<void> | void) => void;
    delete: (event: BroadcastEvent) => Promise<void>;
  };
  getActiveTabLifecycleService: () => IActiveTabLifecycleServiceStatic;
  getRRReplayerWorkerService: () => IRRReplayerWorkerServiceStatic;
  getShadowModeService: () => IShadowModeWorkerServiceStatic;
  getSupabaseClient: () => SupabaseClient;
}

export interface IBaseActionConfigStatic {
  readonly action: ServiceWorkerMessageAction;
  readonly description: string | undefined;
  readonly requestPayloadSchema: ZodSchema<unknown>;
  readonly responsePayloadSchema: ZodSchema<unknown>;
  exec(
    payload: unknown,
    context: IActionConfigExecContext,
    sender: chrome.runtime.MessageSender,
  ): unknown | Promise<unknown>;
}

// Type check function for static side enforcement
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function enforceBaseActionConfigStatic<T extends IBaseActionConfigStatic>(constructor: T) {
  // Implementation is not required, as this serves as a compile-time check
}

export abstract class Base_ActionConfig {
  public static exec(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _payload: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: IActionConfigExecContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _sender: chrome.runtime.MessageSender,
  ): unknown | Promise<unknown> {
    throw new Error('Not implemented');
  }
}
