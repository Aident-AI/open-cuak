import { ALoggerLevel } from '~shared/logging/ALoggerLevel';

export abstract class BaseLogger {
  public abstract log(level: ALoggerLevel, ...meta: unknown[]): void;
  public abstract close(): Promise<void>;
  public abstract isClosed(): boolean;
}
