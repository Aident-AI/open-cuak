export class ObjectUtils {
  public static merge<T extends object, U extends object>(obj1: T, obj2: U, exempt: string[] = []): T & U {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = { ...obj1 };

    Object.keys(obj2).forEach((key) => {
      if (exempt.includes(key)) return;

      const val1 = result[key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val2 = (obj2 as any)[key];

      if (Array.isArray(val1) && Array.isArray(val2)) {
        // Merge arrays
        result[key] = [...val1, ...val2];
      } else if (!val1) {
        result[key] = val2;
      } else if (!val2) {
        result[key] = val1;
      } else if (typeof val1 !== typeof val2) {
        throw new Error(`Cannot merge objects with different types: ${typeof val1} and ${typeof val2}`);
      } else if (typeof val1 === 'object') {
        // Merge objects
        result[key] = ObjectUtils.merge(val1, val2);
      } else if (typeof val1 === 'string' || typeof val1 === 'number') {
        // Merge strings
        result[key] = val1 + val2;
      } else {
        throw new Error(`Cannot merge objects with type ${typeof val1}`);
      }
    });

    return result;
  }

  public static roundToDecimal(obj: any, decimal: number = 2): object {
    const rounded = { ...obj };
    for (const key in obj) {
      if (typeof rounded[key] === 'number') {
        const factor = Math.pow(10, decimal);
        rounded[key] = Math.round((rounded[key] + Number.EPSILON) * factor) / factor;
      }
    }
    return rounded;
  }
}
