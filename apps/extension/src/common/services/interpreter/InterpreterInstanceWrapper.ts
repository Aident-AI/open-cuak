import { ALogger } from '~shared/logging/ALogger';
import { AnyFunction } from '~shared/utils/Function';
import {
  InterpreterAvailableClassRegistry,
  METADATA_KEY_ANNOTATED_METHOD,
  METADATA_KEY_ORIGINAL_NAME,
} from '~src/common/decorators';
import { TypeHelpers } from '~src/common/helpers/TypeHelpers';
import { JsInterpreter } from '~src/common/services/interpreter/JsInterpreter';

export const INTERPRETER_IS_RUNNING_KEY = 'InterpreterIsRunning';

export class InterpreterInstanceWrapper {
  constructor(interpreter: JsInterpreter, globalScope: unknown) {
    this.#instance = interpreter;
    this.#scope = globalScope;
  }

  public prepareInstance() {
    this.#wrapGlobalObjects();
    this.#wrapAnnotatedObjects();

    this.#instance.setProperty(this.#scope, INTERPRETER_IS_RUNNING_KEY, false);
  }

  public resetCallStackAndThrow(error: Error) {
    // clear wrapper state
    this.#asyncOptionHandles.clear();
    this.#interpreterRunningStateHandle.set(false);

    // jump to a completed state stack
    this.#instance.paused_ = false;
    const programStep = { ...this.#instance.stateStack[0] };
    programStep.done = true;
    this.#instance.stateStack = [programStep];

    ALogger.error(error);
    this.#instance.value = 'Error: ' + (error.message || 'Unknown error');
    throw error;
  }

  #instance;
  #scope;
  #asyncOperations = [] as unknown[];

  #asyncOptionHandles = {
    enqueue: (operation: unknown) => this.#asyncOperations.push(operation),
    dequeue: (operation: unknown) => (this.#asyncOperations = this.#asyncOperations.filter((op) => op !== operation)),
    clear: () => (this.#asyncOperations = []),
    getSize: () => this.#asyncOperations.length,
  };

  #interpreterRunningStateHandle = {
    set: (value: boolean) => this.#instance.setProperty(this.#scope, INTERPRETER_IS_RUNNING_KEY, value),
    get: (): boolean => this.#instance.getProperty(this.#scope, INTERPRETER_IS_RUNNING_KEY) ?? false,
  };

  #wrapGlobalObjects = () => {
    if (typeof self === 'undefined') return;

    const globalObjects = Object.getOwnPropertyNames(self)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((i: string) => !!(self as any)[i])
      .reduce(
        (acc, key: string) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          acc[key] = (self as any)[key];
          return acc;
        },
        {} as Record<string, unknown>,
      );

    Object.entries(globalObjects).forEach(([key, target]) => {
      if (this.#instance.getProperty(this.#scope, key)) return;
      this.#appendNativeToGlobalScope(key, target);
    });
  };

  #wrapAnnotatedObjects = () => {
    for (const cls of InterpreterAvailableClassRegistry) {
      const className = Reflect.getMetadata(METADATA_KEY_ORIGINAL_NAME, cls);
      this.#appendNativeToGlobalScope(className, cls);
    }
  };

  #appendNativeToGlobalScope = (key: string, native: unknown) => {
    this.#instance.setProperty(this.#scope, key, this.#createWrappedNativeAny(native));
  };

  #createWrappedNativeAny = (native: unknown) => {
    if (TypeHelpers.isPrimitive(native)) return this.#createWrappedNativePrimitive(native);
    else if (native instanceof Error) return this.#createWrappedNativeError(native);
    else if (typeof native === 'function') return this.#createWrappedNativeFunction(native as AnyFunction);
    else if (Array.isArray(native)) return this.#createWrappedNativeArray(native);
    else return this.#createWrappedNativeObject(native);
  };

  #createWrappedNativePrimitive(primitive: unknown) {
    if (!TypeHelpers.isPrimitive(primitive)) throw new Error('Not a primitive while creating primitive wrapper');
    return this.#instance.nativeToPseudo(primitive);
  }

  #createWrappedNativeError(error: Error) {
    if (!(error instanceof Error)) throw new Error('Not an error while creating error wrapper');
    const e = this.#instance.createObject(this.#instance.ERROR);
    this.#instance.populateError(e, error.message);
    return e;
  }

  #createWrappedNativeFunction(nativeFunction: AnyFunction, nativeClass?: unknown) {
    if (typeof nativeFunction !== 'function') throw new Error('Not a function while creating native function wrapper');
    if (TypeHelpers.isClass(nativeFunction)) return this.#createWrappedNativeClass(nativeFunction);
    if (nativeFunction.length > 20) throw new Error('Function with more than 20 arguments is not supported');

    const interpreter = this.#instance;
    const fn = nativeClass ? nativeFunction.bind(nativeClass) : nativeFunction;
    const wrapResult = (result: unknown) => this.#createWrappedNativeAny(result);
    const asyncOperationHandle = this.#asyncOptionHandles;
    const runningStateHandle = this.#interpreterRunningStateHandle;
    const onResponseError = (error: Error) => this.resetCallStackAndThrow(error);

    const func = function (
      arg1?: unknown,
      arg2?: unknown,
      arg3?: unknown,
      arg4?: unknown,
      arg5?: unknown,
      arg6?: unknown,
      arg7?: unknown,
      arg8?: unknown,
      arg9?: unknown,
      arg10?: unknown,
      arg11?: unknown,
      arg12?: unknown,
      arg13?: unknown,
      arg14?: unknown,
      arg15?: unknown,
      arg16?: unknown,
      arg17?: unknown,
      arg18?: unknown,
      arg19?: unknown,
      arg20?: unknown,
      callback?: AnyFunction,
    ) {
      runningStateHandle.set(true);

      // eslint-disable-next-line prefer-rest-params
      const args = Array.from(arguments).slice(0, -1);
      const nativeArgs = args.map((arg) => interpreter.pseudoToNative(arg));

      let rsp: unknown;
      try {
        // eslint-disable-next-line prefer-spread
        rsp = fn.apply(null, nativeArgs);
      } catch (error: unknown) {
        onResponseError(error as Error);
        return;
      }

      if (!(rsp instanceof Promise)) {
        const pseudoResult = wrapResult(rsp);
        if (callback) callback(pseudoResult);
        runningStateHandle.set(false);
        return;
      }

      rsp
        .then((result: unknown) => {
          if (callback) callback(wrapResult(result));

          asyncOperationHandle.dequeue(rsp);
          if (asyncOperationHandle.getSize() > 0) return;
          runningStateHandle.set(false);
          interpreter.run();
        })
        .catch(onResponseError);

      asyncOperationHandle.enqueue(rsp);
      if (runningStateHandle.get()) interpreter.paused_ = true;
    };
    return interpreter.createAsyncFunction(func);
  }

  #createWrappedNativeClass(nativeClass: object) {
    const taggedMethods = Reflect.getMetadata(METADATA_KEY_ANNOTATED_METHOD, nativeClass) as Map<string, AnyFunction>;
    if (!taggedMethods || taggedMethods.size < 1) {
      ALogger.warn({
        context: 'No tagged methods found for class',
        name: 'name' in nativeClass ? nativeClass.name : 'unknown',
      });
      return;
    }

    const proto = this.#instance.createObjectProto(this.#instance.OBJECT_PROTO);
    for (const [methodName, method] of taggedMethods) {
      const wrappedMethod = this.#createWrappedNativeFunction(method, nativeClass);
      this.#instance.setProperty(proto, methodName, wrappedMethod);
    }
    return proto;
  }

  #createWrappedNativeArray(nativeArray: unknown[]) {
    if (!Array.isArray(nativeArray)) throw new Error('This is not an array while creating native array wrapper');

    const proto = this.#instance.createObjectProto(this.#instance.ARRAY_PROTO);
    nativeArray.forEach((element, index) => {
      const wrappedElement = this.#createWrappedNativeAny(element);
      this.#instance.setProperty(proto, index, wrappedElement);
    });
    return proto;
  }

  #createWrappedNativeObject(nativeObject: unknown) {
    if (typeof nativeObject === 'function') throw new Error('Unexpected function while creating native object wrapper');
    if (TypeHelpers.isPrimitive(nativeObject))
      throw new Error('Unexpected primitive value while creating native object wrapper');

    const proto = this.#instance.createObjectProto(this.#instance.OBJECT_PROTO);
    const serialized = this.#serializeNativeObject(nativeObject as object);
    for (const [key, value] of Object.entries(serialized.properties)) {
      const wrappedValue = this.#createWrappedNativeAny(value);
      this.#instance.setProperty(proto, key, wrappedValue);
    }
    for (const [key, descriptor] of Object.entries(serialized.descriptor)) {
      if (!descriptor) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawDescriptor = descriptor as any;
      const serializedDescriptor = { ...rawDescriptor };
      if (rawDescriptor.get)
        serializedDescriptor.get = this.#instance.createNativeFunction(() =>
          this.#instance.nativeToPseudo(rawDescriptor.get.bind(nativeObject).apply(null, [])),
        );
      if (rawDescriptor.set)
        serializedDescriptor.set = this.#instance.createNativeFunction((value: unknown) =>
          this.#instance.nativeToPseudo(rawDescriptor.set.bind(nativeObject).apply(null, [value])),
        );
      this.#instance.setProperty(proto, key, JsInterpreter.VALUE_IN_DESCRIPTOR, serializedDescriptor);
    }

    return proto;
  }

  #serializeNativeObject(obj: object | null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = { properties: {}, descriptor: {} } as any;
    if (!obj) return null;

    // Getting public attributes (enumerable properties)
    for (const [key, value] of Object.entries(obj)) result.properties[key] = value;

    // Iterating over all properties of the prototype
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gatherProperties = (prototype: any) => {
      if (!prototype || prototype === Object.prototype) return;
      for (const key of Object.getOwnPropertyNames(prototype)) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        if (!descriptor) continue;
        if (typeof descriptor.value === 'function' && key !== 'constructor' && !result.properties[key]) {
          result.properties[key] = prototype[key].bind(obj); // skip if already exists (e.g. overridden method)
        }
        // TODO: check whether we can replace this whole logic using descriptor
        if ((descriptor.get || descriptor.set) && !result.descriptor[key]) result.descriptor[key] = descriptor;
      }
      gatherProperties(Object.getPrototypeOf(prototype));
    };
    gatherProperties(Object.getPrototypeOf(obj));

    return result;
  }
}
