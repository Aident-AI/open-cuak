export class EnumUtils {
  public static getEnumValue<T extends { [k: string]: string }>(
    enumType: T,
    inputString: string,
  ): T[keyof T] | undefined {
    if (!Object.values(enumType).includes(inputString as T[keyof T])) return undefined;
    return inputString as T[keyof T];
  }

  public static isValidEnumValue<T extends { [id: string]: string }>(value: string, enumType: T): value is T[keyof T] {
    return Object.values(enumType).includes(value);
  }
}
