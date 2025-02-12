export class ArrayUtils {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static minus(a: any[], b: any[]): any[] {
    return a.filter((x) => !b.includes(x));
  }

  public static intersect(a: string[], b: string[]): string[] {
    return a.filter((x) => b.includes(x));
  }
}
