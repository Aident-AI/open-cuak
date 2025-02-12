import { BroadcastEvent, BroadcastEventSchema, BroadcastEventType } from '~shared/broadcast/types';
import { SessionStorageService } from '~src/common/services/storage/SessionStorageService';

export class BroadcastService {
  public static async start(): Promise<void> {
    await SessionStorageService.init();
  }

  public static async send<T>(event: BroadcastEvent, value?: T): Promise<void> {
    const key = BroadcastService._getKey(event);
    await SessionStorageService.save(key, value ?? Date.now());
  }

  public static async fetch<T>(event: BroadcastEvent): Promise<T | undefined> {
    const key = BroadcastService._getKey(event);
    return await SessionStorageService.fetch<T>(key);
  }

  public static subscribe<T>(
    event: BroadcastEvent,
    callback: (newValue: T, oldValue?: T) => Promise<void> | void,
  ): void {
    const eventKey = BroadcastService._getKey(event);
    chrome.storage.session.onChanged.addListener((changes) => {
      Object.entries(changes).forEach(([key, change]) => {
        if (key !== eventKey) return;
        callback(change.newValue as T, change.oldValue as T);
      });
    });
  }

  public static subscribeType<T>(
    type: BroadcastEventType,
    callback: (identifier: string | number | undefined, newValue: T, oldValue: T) => void | Promise<void>,
  ): void {
    chrome.storage.session.onChanged.addListener((changes) => {
      Object.entries(changes).forEach(([key, change]) => {
        if (!change.newValue) return;
        const { type: eventType, identifier } = BroadcastService._getEventKey(key);
        if (eventType !== type) return;
        callback(identifier, change.newValue as T, change.oldValue as T);
      });
    });
  }

  public static subscribeAll(
    callback: (targetEvent: Partial<BroadcastEvent>, newValue: unknown, oldValue: unknown) => Promise<void> | void,
  ): void {
    chrome.storage.session.onChanged.addListener((changes) => {
      Object.entries(changes).forEach(([key, change]) => {
        if (!change.newValue) return;
        const { type: type, identifier } = BroadcastService._getEventKey(key);
        callback({ type: type as BroadcastEventType, identifier }, change.newValue, change.oldValue);
      });
    });
  }

  public static delete(event: BroadcastEvent): Promise<void> {
    const key = BroadcastService._getKey(event);
    // chrome.sessions.remove does not trigger `onChange`, so replace with setting undefined
    return SessionStorageService.remove(key);
  }

  private static _getKey(eventKey: BroadcastEvent): string {
    const { type, identifier } = BroadcastEventSchema.parse(eventKey);
    return [type, identifier].join(':');
  }

  private static _getEventKey(key: string): BroadcastEvent {
    const [type, identifier] = key.split(':');
    return { type: type as BroadcastEventType, identifier };
  }
}
