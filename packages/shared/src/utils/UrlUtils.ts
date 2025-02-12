export class UrlUtils {
  public static setURLParameter(key: string, value: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.pushState({}, '', url);
  }

  public static removeURLParameter(key: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    window.history.pushState({}, '', url);
  }

  public static hasURLParameter(key: string): boolean {
    const url = new URL(window.location.href);
    return url.searchParams.has(key);
  }

  public static getURLParameter(key: string): string | null {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  }
}
