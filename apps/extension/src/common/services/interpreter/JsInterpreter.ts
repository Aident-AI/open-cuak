import Interpreter from 'js-interpreter';
import {
  INTERPRETER_IS_RUNNING_KEY,
  InterpreterInstanceWrapper,
} from '~src/common/services/interpreter/InterpreterInstanceWrapper';

export class JsInterpreter extends Interpreter {
  public static create() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new JsInterpreter('', (_interpreter: JsInterpreter, _globalScope: unknown) => {});
  }

  constructor(code: string, initFunc: (interpreter: JsInterpreter, globalScope: unknown) => unknown) {
    let wrapperInstance: InterpreterInstanceWrapper | undefined;
    super(code, (interpreter: JsInterpreter, globalScope: unknown) => {
      const wrapper = new InterpreterInstanceWrapper(interpreter, globalScope);
      wrapper.prepareInstance();
      wrapperInstance = wrapper;

      initFunc(interpreter, globalScope);
    });

    if (!wrapperInstance) throw new Error('wrapperInstance is not initialized');
    this.wrapper = wrapperInstance;
  }

  wrapper: InterpreterInstanceWrapper;

  public get global(): unknown {
    return this.getScope()?.object?.properties ?? {};
  }

  public get isRunning(): boolean {
    const global = this.global as object;
    if (!(INTERPRETER_IS_RUNNING_KEY in global)) return false;
    return (global[INTERPRETER_IS_RUNNING_KEY] as boolean) ?? false;
  }
}
