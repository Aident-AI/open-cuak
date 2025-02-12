export class TypeHelpers {
  public static isPrimitive(value: unknown) {
    return value == null || (typeof value !== 'object' && typeof value !== 'function');
  }

  public static isClass(func: unknown) {
    if (typeof func !== 'function') return false;
    return /^class\s/.test(func.toString());
  }
}
