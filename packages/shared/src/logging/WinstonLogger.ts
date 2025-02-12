import { Logger, createLogger, format } from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import * as Transport from 'winston-transport';
import { getExecEnv } from '~shared/env/ExecutionEnvironment';
import { isDevelopment } from '~shared/env/environment';
import { ALoggerLevel } from '~shared/logging/ALoggerLevel';
import { AwsCloudWatchLogs } from '~shared/logging/AwsCloudWatchLogs';
import { BaseLogger } from '~shared/logging/BaseLogger';
import { LogLine } from '~shared/logging/LogLine';
import { RequestId } from '~shared/logging/RequestId';

const CLOUDWATCH_TRANSPORT_NAME = 'cloudwatch-logger';

export const getLogGroupName = () => 'app-logger.' + (isDevelopment() ? 'DEVELOPMENT' : 'PRODUCTION');

export class WinstonLogger extends BaseLogger {
  static #warned = false;

  public constructor() {
    super();

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
      if (!WinstonLogger.#warned) {
        console.warn('AWS credentials are required for logging. Falling back to console.log.');
        WinstonLogger.#warned = true;
      }

      this.#logger = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
      } as unknown as Logger;
      this.#useFallbackConsoleLog = true;
      return;
    }

    const cloudWatchTransport = new WinstonCloudWatch({
      awsOptions: {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION,
      },
      ensureLogGroup: true,
      // eslint-disable-next-line no-console
      errorHandler: (error) => console.error('CloudWatch transport error', error),
      jsonMessage: true,
      level: isDevelopment() ? 'debug' : 'info',
      logGroupName: getLogGroupName(),
      logStreamName: getExecEnv(),
      name: CLOUDWATCH_TRANSPORT_NAME,
      silent: false,
    });

    const transports: Transport[] = [cloudWatchTransport];
    this.#logger = createLogger({
      format: format.combine(
        format((line) => ({
          ...line,
          environment: line.environment ?? getExecEnv(),
          createdAt:
            typeof line.createdAt === 'string' || typeof line.createdAt === 'number'
              ? new Date(line.createdAt)
              : new Date(),
          buildEnv: process.env.NEXT_PUBLIC_BUILD_ENV,
          requestId: RequestId.get(),
        }))(),
        format.errors({ stack: true }),
        format.json(),
      ),

      // log handlers
      transports: transports,
      exceptionHandlers: transports,
      rejectionHandlers: transports,
    });
    this.#logger.on('error', (error) => {
      throw error;
    });
  }

  public log(level: ALoggerLevel, message: unknown) {
    if (this.#useFallbackConsoleLog) return;
    this.#logger.log(level, message);
  }

  public logLine(level: ALoggerLevel, line: LogLine) {
    this.#logger.log(level, line);
    // eslint-disable-next-line no-console
    if (level in console && level !== ALoggerLevel.VERBOSE) console[level](line);
  }

  public async close() {
    if (this.#useFallbackConsoleLog) return;
    if (this.isClosed()) return;

    // Flush and close all transports
    const cwTransport = this.#logger.transports.find(
      (t) => 'name' in t && t.name === CLOUDWATCH_TRANSPORT_NAME,
    ) as WinstonCloudWatch;
    if (cwTransport)
      cwTransport.kthxbye((e) => {
        // eslint-disable-next-line no-console
        if (e) console.error('kthxbye error', e);
      });
    this.#logger.transports.forEach((t) => t.close?.());
    await AwsCloudWatchLogs.close();

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.info('Grace period for logging before closing.');
        resolve();
      }, 1_000);
    });

    this.#logger.close();
    this.#logger.destroy();
    this.#isClosed = true;
  }

  public isClosed() {
    return this.#isClosed;
  }

  #logger: Logger;
  #isClosed = false;
  #useFallbackConsoleLog = false;
}
