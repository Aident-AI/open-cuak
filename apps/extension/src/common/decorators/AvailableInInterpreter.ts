import 'reflect-metadata';
import { AnyFunction } from '~shared/utils/Function';

export const METADATA_KEY_ANNOTATED_CLASS = 'available-in-interpreter';
export const METADATA_KEY_ANNOTATED_METHOD = 'available-method-in-interpreter';
export const METADATA_KEY_ORIGINAL_NAME = 'original-name';

export const InterpreterAvailableClassRegistry = new Set<AnyFunction>();

export const AvailableInInterpreter = (
  target: object,
  propertyKey?: string | symbol,
  _descriptor?: PropertyDescriptor,
  originalName?: string,
) => {
  // if true, then this is a class decorator
  // Note: class decorator has conflict with private field `#` syntax, so avoid that
  if (propertyKey === undefined) {
    if (originalName) Reflect.defineMetadata(METADATA_KEY_ORIGINAL_NAME, originalName, target);
    Reflect.defineMetadata(METADATA_KEY_ANNOTATED_CLASS, true, target);
    InterpreterAvailableClassRegistry.add(target as AnyFunction);
    return;
  }

  if (!Reflect.hasMetadata(METADATA_KEY_ANNOTATED_METHOD, target)) {
    Reflect.defineMetadata(METADATA_KEY_ANNOTATED_METHOD, new Map<string, AnyFunction>(), target);
  }
  const methodsMap = Reflect.getMetadata(METADATA_KEY_ANNOTATED_METHOD, target) as Map<string, AnyFunction>;
  if (!(propertyKey in target)) throw new Error(`Method key not found in target: ${String(propertyKey)}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methodsMap.set(propertyKey.toString(), (target as any)[propertyKey] as AnyFunction);
};

export const AvailableInInterpreterWithOriginalName = (originalName?: string) => {
  return (target: object, propertyKey?: string | symbol) =>
    AvailableInInterpreter(target, propertyKey, undefined, originalName);
};
