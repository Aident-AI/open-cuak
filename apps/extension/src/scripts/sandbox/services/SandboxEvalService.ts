import { v4 as UUID } from 'uuid';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { SandboxMessage, SandboxMessageType } from '~shared/messaging/sandbox/types';

export class SandboxEvalService {
  public static createFunction(functionValue: string) {
    const fn = new Function(functionValue)();
    const rsp = this._handleResponse(fn);
    return rsp;
  }

  public static invokeFunction(fnId: string, args: unknown[]) {
    const fn = this.instance.#createdFunctions.get(fnId);
    if (!fn) throw new Error('fn not found');
    const result = fn(...args);
    return this._handleResponse(result);
  }

  static #instance: SandboxEvalService;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static _handleResponse = (fn: any): object => {
    const fnId = UUID();
    if (typeof fn !== 'function') {
      return {
        type: typeof fn,
        value: fn,
        functionValue: fn.toString(),
      };
    }

    this.instance.#createdFunctions.set(fnId, fn);
    const invocation = {
      receiver: RuntimeMessageReceiver.SANDBOX,
      action: SandboxMessageType.INVOKE_FUNCTION,
      payload: { id: fnId },
    } as SandboxMessage;
    return {
      type: typeof fn,
      value: invocation,
      functionValue: fn.toString(),
    };
  };

  private static get instance() {
    if (!this.#instance) this.#instance = new SandboxEvalService();
    return this.#instance;
  }

  private constructor() {}

  #createdFunctions = new Map<string, (...args: unknown[]) => unknown>();
}
