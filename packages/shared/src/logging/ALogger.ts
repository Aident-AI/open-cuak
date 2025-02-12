import { v4 as uuid } from 'uuid';
import { ExecutionEnvironment, getExecEnv, setExecEnv } from '~shared/env/ExecutionEnvironment';
import { ALoggerLevel } from '~shared/logging/ALoggerLevel';
import { BaseLogger } from '~shared/logging/BaseLogger';
import { ClientLogger } from '~shared/logging/ClientLogger';
import { RequestId } from '~shared/logging/RequestId';

export class ALogger {
  public static async genInit(requestId: string | undefined, env?: ExecutionEnvironment): Promise<void> {
    RequestId.set(requestId ?? uuid());
    if (env) void setExecEnv(env);
    if (!this.isClosed()) return;

    let logger: BaseLogger;
    if (typeof window !== 'undefined' || getExecEnv().includes('extension')) {
      // Client-side
      logger = new ClientLogger();
    } else {
      // Server-side
      const { WinstonLogger } = await import('./WinstonLogger');
      logger = new WinstonLogger();
    }
    this.#instance = new ALogger(logger);
  }

  public static error(...meta: unknown[]) {
    this.log(ALoggerLevel.ERROR, ...meta);
  }

  public static warn(...meta: unknown[]) {
    this.log(ALoggerLevel.WARN, ...meta);
  }

  public static info(...meta: unknown[]) {
    this.log(ALoggerLevel.INFO, ...meta);
  }

  public static debug(...meta: unknown[]) {
    this.log(ALoggerLevel.DEBUG, ...meta);
  }

  public static verbose(...meta: unknown[]) {
    this.log(ALoggerLevel.VERBOSE, ...meta);
  }

  public static log(level: ALoggerLevel, ...meta: unknown[]) {
    if (!this.#instance) {
      // eslint-disable-next-line no-console
      console.error('ALogger is not initialized.', { level, meta });
      return;
    }

    const message = meta.length <= 1 ? meta[0] : meta;
    if (level !== ALoggerLevel.VERBOSE) this.getInstance()!.#logger.log(level, { message });
    if (!(level in console)) return;

    const metaContent = meta.length > 1 ? meta : meta[0];
    const stringifyWithBigInt = (value: unknown) =>
      typeof value === 'bigint'
        ? value.toString() + 'n' // Adding 'n' to indicate it's a BigInt
        : value;
    const consoleLine =
      level === 'error'
        ? metaContent
        : typeof metaContent === 'string'
          ? metaContent
          : JSON.stringify(metaContent, (_, value) => stringifyWithBigInt(value));
    // eslint-disable-next-line no-console
    if (level !== ALoggerLevel.VERBOSE) console[level](consoleLine);
    // eslint-disable-next-line no-console
    else console.debug(consoleLine);
  }

  public static async close() {
    if (!this.#instance) return;

    await this.getInstance()!.#logger.close();
    this.#instance = undefined;
  }

  public static isClosed() {
    return !this.#instance;
  }

  public static getInstance(): ALogger | undefined {
    // TODO: disable this check for production for now to avoid 500 errors in production
    // if (!this.#instance) throw new Error('ALogger is not initialized.');
    return this.#instance;
  }

  static #instance: ALogger | undefined;

  private constructor(logger: BaseLogger) {
    this.#logger = logger;
  }

  #logger: BaseLogger;
}
