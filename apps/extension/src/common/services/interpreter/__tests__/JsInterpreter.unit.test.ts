import { WaitUtils } from '~shared/utils/WaitUtils';
import { InterpreterService } from '~src/common/services/interpreter/InterpreterService';
import { JsInterpreter } from '~src/common/services/interpreter/JsInterpreter';

describe('JsInterpreter', () => {
  describe('create', () => {
    it('creates a js-interpreter instance', async () => {
      const instance = JsInterpreter.create();
      expect(instance).toBeDefined();
    });

    it('creates a js-interpreter instance with global scope', async () => {
      const instance = JsInterpreter.create();
      expect(instance.global).toBeDefined();
    });

    it('creates an instance with wrapped global scope', async () => {
      const instance = JsInterpreter.create();
      expect(instance.global).toBeDefined();
      expect(instance.isRunning).toBeFalsy();
    });
  });

  describe('appendCode', () => {
    let interpreter: JsInterpreter;

    beforeEach(() => {
      interpreter = JsInterpreter.create();
    });

    describe('simple code', () => {
      it('appends code to the interpreter', async () => {
        interpreter.appendCode('1 + 2');
        expect(interpreter.isRunning).toBeFalsy();

        interpreter.run();
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
        expect(interpreter.value).toBe(3);
      });

      it('appends multiple lines of codes to the interpreter and returns a value', async () => {
        interpreter.appendCode('a = 1 + 2');
        interpreter.appendCode('b = a + 2');
        interpreter.run();
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
        expect(interpreter.value).toBe(5);

        interpreter.appendCode('b++');
        interpreter.run();
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
        expect(interpreter.value).toBe(5);

        interpreter.appendCode('b');
        interpreter.run();
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
        expect(interpreter.value).toBe(6);
      });
    });

    describe('function code', () => {
      const fnCode = 'a = b => b+2';

      it('appends a js code and throw', async () => {
        expect(() => interpreter.appendCode(fnCode)).toThrow('Unexpected token');
      });

      it('appends a transpiled ts code and run', async () => {
        interpreter.appendCode(InterpreterService.transpileTsToJs(fnCode));
        interpreter.appendCode('a(1)');
        interpreter.run();
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
        expect(interpreter.value).toBe(3);

        interpreter.appendCode('a(2)');
        interpreter.run();
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
        expect(interpreter.value).toBe(4);

        interpreter.appendCode('a(10)');
        interpreter.run();
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
        expect(interpreter.value).toBe(12);
      });
    });

    describe('async function code', () => {
      const fnCode = 'a = async (b) => { setTimeout(() => { return b+2 }, 300) }';

      it('appends a js code and throw', async () => {
        expect(() => interpreter.appendCode(fnCode)).toThrow('Unexpected token');
      });

      it('appends a transpiled ts code and run', async () => {
        expect(() => InterpreterService.transpileTsToJs(fnCode)).toThrow('Async function is not supported yet.');
      });
    });

    describe('exception', () => {
      it('throws an exception when the code is invalid', async () => {
        expect(() => interpreter.appendCode('1 +')).toThrow('Unexpected token');
        expect(() => interpreter.run()).not.toThrow(Error);
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
      });

      it('throws an exception when the code throws an exception', async () => {
        const code = 'throw new Error("test")';
        expect(() => interpreter.appendCode(code)).not.toThrow(Error);
        expect(() => interpreter.run()).toThrow('test');
        await WaitUtils.waitUntil(() => !interpreter.isRunning);
        expect(interpreter.isRunning).toBeFalsy();
      });
    });
  });
});
