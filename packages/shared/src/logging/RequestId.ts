export class RequestId {
  public static get(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestId = (global as any).RequestId;
    if (!requestId) throw new Error('RequestId is not set');
    return requestId;
  }

  public static set(requestId: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).RequestId = requestId;
  }

  public static clear(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).RequestId;
  }
}
