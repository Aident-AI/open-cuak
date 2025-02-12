type CallbackFunction = () => void | Promise<void>;

export class TimerUtils {
  constructor(
    callback: CallbackFunction,
    public readonly timeout: number = 30_000,
  ) {
    this.#callback = callback;
  }

  public start(callbackOverride?: CallbackFunction): void {
    if (this.#timer) throw new Error('timer already started');

    this.#timer = setTimeout(() => {
      this.#timer = null;
      (callbackOverride ?? this.#callback)();
    }, this.timeout);
  }

  public stop(): void {
    if (!this.#timer) return;

    clearTimeout(this.#timer);
    this.#timer = null;
  }

  public restart(callbackOverride?: CallbackFunction): void {
    this.stop();
    this.start(callbackOverride);
  }

  #timer: NodeJS.Timeout | null = null;
  #callback: CallbackFunction;
}
