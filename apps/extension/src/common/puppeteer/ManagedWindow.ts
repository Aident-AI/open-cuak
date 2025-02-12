import { BroadcastEventType } from '~shared/broadcast/types';
import { ChromeWindow } from '~shared/chrome/Window';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';

export class ManagedWindow {
  public static async addCurrentToBeManaged(): Promise<void> {
    const window = await chrome.windows.getCurrent({ populate: false });
    if (!window) throw new Error('No active window found');
    if (!window.id) throw new Error('Window has no ID');

    this.#windowIds.add(window.id);
    this.#broadcastManagedWindowsUpdated();
  }

  public static async removeCurrentFromManaged(): Promise<void> {
    const window = await chrome.windows.getCurrent({ populate: false });
    if (!window) throw new Error('No active window found');
    if (!window.id) throw new Error('Window has no ID');

    this.#windowIds.delete(window.id);
    this.#broadcastManagedWindowsUpdated();
  }

  public static isManaged(window: ChromeWindow): boolean {
    if (!window.id) throw new Error('Window has no ID');
    return this.isManagedWindowId(window.id);
  }

  public static isManagedWindowId(windowId: number): boolean {
    return this.#windowIds.has(windowId);
  }

  public static isCurrentManaged(): boolean {
    return this.isManagedWindowId(ActiveTabService.getInServiceWorker().windowId);
  }

  static #windowIds = new Set<number>();

  static #broadcastManagedWindowsUpdated(): void {
    BroadcastService.send({ type: BroadcastEventType.MANAGED_WINDOWS_UPDATED }, Array.from(this.#windowIds));
  }
}
