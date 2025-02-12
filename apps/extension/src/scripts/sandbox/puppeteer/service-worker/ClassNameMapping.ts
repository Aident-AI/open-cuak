export const ClassNameMapping = {} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const invokeStaticMethod = async (className: any, methodName: string, paramsArray: any[]) => {
  const fn = className[methodName];
  if (!fn || typeof fn !== 'function')
    throw new Error(`Method ${methodName} is not a function on the given class`, className);

  const result = fn(...paramsArray);
  if (result instanceof Promise) return await result;
  else return result;
};
