export class SyncStorageService {
  public static async save(obj: object) {
    await chrome.storage?.sync?.set(obj);
  }

  public static async fetchAll() {
    await chrome.storage?.sync?.get();
  }

  public static async fetch(keys: string[]): Promise<{ [key: string]: object }> {
    return await chrome.storage?.sync?.get(keys);
  }

  public static async fetchByKey<T>(key: string): Promise<T> {
    const dict = await chrome.storage?.sync?.get(key);
    return dict[key] as T;
  }

  public static async remove(keys: string[] | string) {
    await chrome.storage?.sync?.remove(keys);
  }
}
