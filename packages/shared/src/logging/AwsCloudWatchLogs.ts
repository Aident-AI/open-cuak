import * as AWS from '@aws-sdk/client-cloudwatch-logs';
import { ALogger } from '~shared/logging/ALogger';
import { LogLine } from '~shared/logging/LogLine';
import { getLogGroupName } from '~shared/logging/WinstonLogger';

export class AwsCloudWatchLogs {
  public static async log(logStreamName: string, logLine: LogLine) {
    if (!this.#instance) {
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
        if (!this.#warned) {
          console.warn('AWS credentials are required for logging. Skipping log to CloudWatch.');
          this.#warned = true;
        }
        return;
      }

      this.#instance = new AWS.CloudWatchLogs({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION,
      });
    }

    const client = this.#instance;
    const logGroupName = getLogGroupName();

    try {
      const logEvents = [{ timestamp: new Date(logLine.createdAt).getTime(), message: JSON.stringify(logLine) }];
      await client.putLogEvents({ logGroupName, logStreamName, logEvents });
    } catch (error) {
      ALogger.error({ api: 'api/log', context: 'Failed to log to CloudWatch:', error: error as Error });
      ALogger.info({ api: 'api/log', context: 'Falling back to console.log:', logLine });
    }
  }

  public static async close() {
    if (!this.#instance) return;

    this.#instance.destroy();
    this.#instance = undefined;
  }

  static #instance: AWS.CloudWatchLogs | undefined;
  static #warned = false;
}
