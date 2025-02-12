export class TransportError extends Error {
  constructor(error: chrome.runtime.LastError | Error) {
    super(error.message);
    this.name = 'TransportError';
    try {
      this.#body = JSON.parse(error?.message ?? error.toString());
    } catch (e) {
      this.#body = { message: error?.message ?? error.toString() };
    }
  }

  public get code(): number | undefined {
    if (!this.#body || !('code' in this.#body)) return undefined;
    return this.#body?.code as number;
  }

  public get body() {
    return this.#body;
  }

  public get message() {
    if (!this.#body || !('message' in this.#body)) return super.message;
    return (this.#body.message as string) ?? super.message;
  }

  #body: object | undefined;
}

export const KnownCdpErrorCodeSet = new Set<number>([
  -32000, // target not found
  -32601, // command not found
] as const);
