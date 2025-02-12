import { CdpConnectionProxyClient } from '~src/scripts/sandbox/puppeteer/service-worker/CdpConnectionProxyClient';

export const EvalObjectMapping = {
  'CdpConnectionProxyClient.connection': CdpConnectionProxyClient.connection,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const invokeInstanceMethod = async (object: any, methodName: string, paramsArray: any[]) => {
  const fn = object[methodName];
  if (!fn || typeof fn !== 'function')
    throw new Error(`Method ${methodName} is not a function on the given object`, object);

  const result = fn(...paramsArray);
  if (result instanceof Promise) return await result;
  else return result;
};
