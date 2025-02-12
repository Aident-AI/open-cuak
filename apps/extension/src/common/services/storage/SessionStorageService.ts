export class SessionStorageService {
  public static async init(): Promise<void> {
    await chrome.storage.session.setAccessLevel({
      accessLevel: chrome.storage.AccessLevel.TRUSTED_AND_UNTRUSTED_CONTEXTS,
    });
  }

  public static async save<T>(key: string, value: T): Promise<void> {
    await chrome.storage.session.set({ [key]: value });
  }

  public static async fetch<T>(key: string): Promise<T | undefined> {
    const rsp = await chrome.storage.session.get(key);
    return rsp[key] as T;
  }

  public static async remove(key: string): Promise<void> {
    await chrome.storage.session.remove(key);
  }
}
