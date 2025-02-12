import { sendSandboxMessage } from '~shared/chrome/messaging/sendTabMessage';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import {
  SandboxMessage,
  SandboxMessageResponseSchema,
  SandboxMessageSchema,
  SandboxMessageType,
} from '~shared/messaging/sandbox/types';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';

/**
 * This is an override for puppeteer's `Function.ts` file.
 *
 * We replaced all the direct `new Function()` calls with `createFunctionAsync()`, which directs the
 * request to the sandboxed page, to address the constrain of not able to `eval` or `new Function()`
 * in service worker due of CSP policy.
 *
 */
const createdFunctions = new Map<string, (...args: unknown[]) => unknown>();

const _createFunction = async (functionValue: string): Promise<(...args: unknown[]) => unknown> => {
  const targetTabId = await _getActiveTabId();
  const message = {
    receiver: RuntimeMessageReceiver.SANDBOX,
    action: SandboxMessageType.CREATE_FUNCTION,
    payload: { functionValue },
  } as SandboxMessage;

  const rsp = await sendSandboxMessage(targetTabId, message);
  const response = SandboxMessageResponseSchema.parse(rsp);
  if (!response || !response.success) throw new Error(response?.error);
  if (!response.data) throw new Error('response.data not found for `create-function`, functionValue=' + functionValue);

  const { type: responseType, value } = response.data;
  if (!responseType || responseType !== 'function' || !value)
    throw new Error('payload.type is not function, response.data=' + response.data);

  const { receiver: type, action, payload } = SandboxMessageSchema.parse(value);
  const fnId = payload.id;
  if (!fnId) throw new Error('fnId not found');

  const fn = async (...args: unknown[]) =>
    await sendSandboxMessage(targetTabId, { receiver: type, action, payload: { ...payload, ...args } });
  createdFunctions.set(fnId, fn);

  return async (...args) => await _invokeFunction(fnId, args);
};

const _invokeFunction = async (fnId: string, args: unknown[]): Promise<unknown> => {
  const fn = createdFunctions.get(fnId);
  if (!fn) throw new Error('fn not found');
  const rsp = await fn(...args);
  const response = SandboxMessageResponseSchema.parse(rsp);
  if (!response || !response.success) throw new Error(response?.error);
  if (!response.data) throw new Error('response.data not found for `invoke-function`, response=' + response);

  const { type: responseType, value } = response.data;
  if (!responseType || !value) throw new Error('invalid `invoke-function` response, response.data=' + response.data);
  if (responseType !== 'function') return value;

  // value is a function
  const { receiver: type, action, payload } = SandboxMessageSchema.parse(value);
  const newFnId = payload.id;
  if (!newFnId) throw new Error('fnId not found in response payload');

  const targetTabId = await _getActiveTabId();
  const newFn = async (...newArgs: unknown[]) =>
    await sendSandboxMessage(targetTabId, { receiver: type, action, payload: { ...payload, ...newArgs } });
  createdFunctions.set(newFnId, newFn);

  return async (...expectedArgs: unknown[]) => await _invokeFunction(fnId, expectedArgs);
};

const _getActiveTabId = async (): Promise<number> => {
  const activeTab = ActiveTabService.getInServiceWorker();
  const targetTabId = activeTab?.id;
  if (!targetTabId) throw new Error('targetTabId not found');
  return targetTabId;
};

export const createFunctionAsync = async (functionValue: string): Promise<(...args: unknown[]) => unknown> => {
  let fn = createdFunctions.get(functionValue);
  if (fn) {
    return fn;
  }
  const newFunction = await _createFunction(`return ${functionValue}`);
  fn = newFunction() as (...args: unknown[]) => unknown;
  createdFunctions.set(functionValue, fn);
  return fn;
};

export async function stringifyFunctionAsync(fn: (...args: never) => unknown): Promise<string> {
  let value = fn.toString();
  try {
    await _createFunction(`return ${value}`);
  } catch (error) {
    ALogger.error(error);

    // This means we might have a function shorthand (e.g. `test(){}`). Let's
    // try prefixing.
    let prefix = 'function ';
    if (value.startsWith('async ')) {
      prefix = `async ${prefix}`;
      value = value.substring('async '.length);
    }
    value = `${prefix}${value}`;
    try {
      await _createFunction(`return (${value})`);
    } catch (e) {
      ALogger.error(e);

      // We tried hard to serialize, but there's a weird beast here.
      throw new Error('Passed function cannot be serialized! Try reloading the page.');
    }
  }
  return value;
}

export const interpolateFunctionAsync = async <T extends (...args: never[]) => unknown>(
  fn: T,
  replacements: Record<string, string>,
): Promise<T> => {
  let value = await stringifyFunctionAsync(fn);
  for (const [name, jsValue] of Object.entries(replacements)) {
    value = value.replace(
      new RegExp(`PLACEHOLDER\\(\\s*(?:'${name}'|"${name}")\\s*\\)`, 'g'),
      // Wrapping this ensures tersers that accidently inline PLACEHOLDER calls
      // are still valid. Without, we may get calls like ()=>{...}() which is
      // not valid.
      `(${jsValue})`,
    );
  }
  return (await createFunctionAsync(value)) as unknown as T;
};

declare global {
  /**
   * Used for interpolation with {@link interpolateFunction}.
   *
   * @internal
   */
  function PLACEHOLDER<T>(name: string): T;
}
