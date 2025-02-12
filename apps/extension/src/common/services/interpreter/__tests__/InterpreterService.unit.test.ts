import { InterpreterService } from '~src/common/services/interpreter/InterpreterService';

describe('callSerializePseudoObject', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callSerializePseudoObject = (obj: object) => (InterpreterService as any)['_serializePseudoObject'](obj);

  class A {
    get b() {
      return 'a';
    }
    set d(value: unknown) {}
  }
  const bDescriptor = Object.getOwnPropertyDescriptor(A.prototype, 'b');
  const dDescriptor = Object.getOwnPropertyDescriptor(A.prototype, 'd');
  const getter = bDescriptor!.get; // Getter method for 'b'
  const setter = dDescriptor!.set; // Setter method for 'd'

  it('serializes native object', () => {
    const obj = { a: 1, b: 2 };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual(obj);
  });

  it('returns array of primitives and non-empty objects', () => {
    const obj = [1, 2, { a: 1 }, { b: [{ c: 1 }, 2] }];
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual(obj);
  });

  it('ignores empty fields', () => {
    const obj = { a: 1, b: 2, getter: {}, setter: null, proto: undefined, children: [] };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual({ a: 1, b: 2 });
  });

  it('serializes nested objects', () => {
    const obj = { a: 1, b: 2, c: { d: 3, e: { f: 4 } } };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual(obj);
  });

  it('returns null for objects containing with only empty fields', () => {
    const obj = { j: {}, k: undefined };
    const result = callSerializePseudoObject(obj);
    expect(result).toBeNull();
  });

  it('returns null for array containing objects with only empty fields', () => {
    const obj = [{ j: {}, k: undefined }];
    const result = callSerializePseudoObject(obj);
    expect(result).toBeNull();
  });

  it('serializes nested objects with empty fields', () => {
    const obj = { a: 1, b: 2, c: { d: 3, e: { f: 4, g: null, h: undefined }, i: [{ j: {}, k: undefined }] } };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual({ a: 1, b: 2, c: { d: 3, e: { f: 4 } } });
  });

  it('serializes non-empty nested objects', () => {
    const obj = { a: 1, b: 2, c: { d: 3, e: { f: 4, g: {}, h: [] }, i: [1, 2], j: [{ a: 1, b: {} }] } };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual({ a: 1, b: 2, c: { d: 3, e: { f: 4 }, i: [1, 2], j: [{ a: 1 }] } });
  });

  it('returns an array if the object has class of Array', () => {
    const obj = { class: 'Array', properties: { 0: 1, 1: 2 } };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual([1, 2]);
  });

  it('ignores empty getter and setter attributes', () => {
    const obj = { getter: {}, setter: {}, properties: { 0: 1, 1: 2 } };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual({ 0: 1, 1: 2 });
  });

  it('serializes getter and setter attributes', () => {
    const obj = {
      getter: { a: { class: 'Function', properties: { name: 'get a', length: 0 } }, b: getter },
      setter: { c: { class: 'Function', properties: { name: 'set c', length: 1 } }, d: setter },
      properties: { 0: 1, 1: 2 },
    };
    const result = callSerializePseudoObject(obj);
    expect(result).toStrictEqual({
      0: 1,
      1: 2,
      'get a': { class: 'Function', name: 'get a', length: 0 },
      'get b': { class: 'Function', name: 'get b', length: 0 },
      'set c': { class: 'Function', name: 'set c', length: 1 },
      'set d': { class: 'Function', name: 'set d', length: 1 },
    });
  });
});

describe('interpretLine', () => {
  it('interprets a line', async () => {
    const result = await InterpreterService.interpretLine('1 + 2');
    expect(result).toBe(3);
  });

  it('interprets a class with getters and setters', async () => {
    await InterpreterService.interpretLine(`
      class A {
        get a() { return 'a'; }
        get b() { return this._b; }
        set b(value) { this._b = value; }
        _b = 'b';
      }

      const a = new A();
    `);

    const result1 = await InterpreterService.interpretLine(`a.a`);
    expect(result1).toBe('a');

    const result2 = await InterpreterService.interpretLine(`a.b`);
    expect(result2).toBe('b');

    const result3 = await InterpreterService.interpretLine(`a.b = 'c'`);
    expect(result3).toBe('c');
  });

  it('interprets lines with persisted context', async () => {
    await InterpreterService.interpretLine(`const a = 1`);
    await InterpreterService.interpretLine(`const b = 2`);
    const result = await InterpreterService.interpretLine(`a + b`);
    expect(result).toBe(3);
  });

  describe('functions', () => {
    beforeEach(async () => {
      InterpreterService.reload();
    });

    it('interprets a function and returns undefined', async () => {
      let result = await InterpreterService.interpretLine(`function a(b) { return b+2; }`);
      expect(result).toBeUndefined();

      result = await InterpreterService.interpretLine(`a(2)`);
      expect(result).toBe(4);
    });

    it('interprets an arrow function and returns a class object', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result = (await InterpreterService.interpretLine(`a = b => b+2`)) as any;
      expect(result).toBeDefined();
      expect(result!.class).toEqual('Function');
      expect(result!.name).toEqual('a');

      result = await InterpreterService.interpretLine(`a(2)`);
      expect(result).toBe(4);

      result = await InterpreterService.interpretLine(`a(10)`);
      expect(result).toBe(12);
    });

    it('throws when receiving an async function', async () => {
      await expect(InterpreterService.interpretLine(`a = async b => b+2`)).rejects.toThrow(
        'Async function is not supported yet',
      );
    });
  });
});

describe('interpret one-off lines', () => {
  it('interprets one-off lines', async () => {
    const result = await InterpreterService.interpretLine('1 + 2', true);
    expect(result).toBe(3);
  });
});
