import ts from 'typescript';
import { ALogger } from '~shared/logging/ALogger';
import { WaitUtils } from '~shared/utils/WaitUtils';
import { JsInterpreter } from '~src/common/services/interpreter/JsInterpreter';

export class InterpreterService {
  public static async start() {
    this._instance;

    // skip setting quick accesses for test
    if (process.env.NODE_ENV === 'test') return;

    // quick accesses
    await this.interpretLine(`is = InteractableService;`);
    await this.interpretLine(`i = is.getInteractableOrThrow;`);
    await this.interpretLine(`p = is.getPageOrThrow;`);
    await this.interpretLine(`rs = RRReplayerWorkerService;`);
  }

  public static async reload(): Promise<void> {
    this.#instance = JsInterpreter.create();
    await this.start();
  }

  public static transpileTsToJs = (tsCode: string) => {
    const transpiled = ts.transpileModule(tsCode, {
      compilerOptions: {
        module: ts.ModuleKind.None,
        target: ts.ScriptTarget.ES5, // js-interpreter supports ES5 only
      },
    }).outputText;
    const isAsyncFunction = transpiled.startsWith(
      'var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {',
    );
    if (isAsyncFunction)
      throw new Error(
        'Async function is not supported yet. Use it as a sync function, as all functions will be awaited.',
      );
    return transpiled;
  };

  public static async interpretLine(input: string, isOneOff = false) {
    try {
      const code = this.transpileTsToJs(input);
      const instance = isOneOff ? JsInterpreter.create() : this._instance;
      instance.appendCode(code);
      instance.run();
      await WaitUtils.waitUntil(() => !instance.isRunning, {
        timeoutCallback: () => instance.wrapper.resetCallStackAndThrow(new Error('timeout')),
      });
      return this._serializePseudoObject(instance.value);
    } catch (error) {
      ALogger.error({ stack: 'Interpreter', error });
      throw error;
    }
  }

  static #instance: JsInterpreter | null = null;

  private static get _instance(): JsInterpreter {
    if (!this.#instance) this.#instance = JsInterpreter.create();
    return this.#instance;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static _serializePseudoObject(obj: any): object | undefined | null {
    if (!obj) return obj;
    if (obj instanceof Error) throw obj;
    if (typeof obj !== 'object' && typeof obj !== 'function') return obj;

    if (Array.isArray(obj)) {
      // native array
      const arr = obj.map((v) => this._serializePseudoObject(v)).filter((v) => !!v);
      return arr.length > 0 ? arr : null;
    }
    if (obj.class === 'Array' || obj.proto?.class === 'Array') {
      // pseudo array
      const arr = [] as unknown[];
      Object.entries(obj.properties).forEach(([index, value]) => {
        if (value) arr[Number(index)] = this._serializePseudoObject(value);
      });
      return arr;
    }
    if (obj.class === 'Function' || typeof obj === 'function') {
      const { name, length } = (obj.class ? obj.properties : obj) ?? {};
      return { class: 'Function', name, length };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {} as any;
    for (const [key, value] of Object.entries(obj)) {
      // skip constructor for now due to circular reference
      if (key === 'constructor') continue;

      const preprocessed = result[key];
      if (preprocessed && (typeof preprocessed !== 'object' || Object.keys(preprocessed).length > 0)) continue;

      if (value === null || value === undefined) continue;
      if (typeof value !== 'object' && typeof value !== 'function') {
        result[key] = value;
        continue;
      }
      const serialized = this._serializePseudoObject(value);
      if (!serialized) continue;

      const prepareGetterOrSetter = (type: 'get' | 'set') => {
        for (const [fncName, fnc] of Object.entries(serialized)) {
          if (typeof fnc !== 'function' && fnc.class !== 'Function') throw new Error('Invalid getter/setter');
          result[`${type} ${fncName}`] = fnc;
        }
      };

      switch (key) {
        case 'getter': {
          prepareGetterOrSetter('get');
          continue;
        }

        case 'setter': {
          prepareGetterOrSetter('set');
          continue;
        }

        case 'properties':
        case 'proto': {
          for (const [objKey, objValue] of Object.entries(serialized)) {
            if (typeof result[objKey] !== 'object') {
              if (!result[objKey]) result[objKey] = objValue;
              continue;
            }
            if (!result[objKey] || Object.keys(result[objKey]).length < 1)
              result[objKey] = { ...objValue, ...result[objKey] };
          }
          continue;
        }

        default:
          result[key] = serialized;
          continue;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }
}
