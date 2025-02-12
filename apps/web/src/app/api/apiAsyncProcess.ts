import { waitUntil } from '@vercel/functions';
import { nanoid } from 'nanoid';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { isDevelopment } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { RequestId } from '~shared/logging/RequestId';

export class RunningAsyncProcesses {
  public static hasAsyncProcess(): boolean {
    return this.#processIds.size > 0;
  }

  public static add(processId: string): void {
    this.#processIds.add(processId);
  }

  public static remove(processId: string): void {
    this.#processIds.delete(processId);
  }

  static #processIds = new Set<string>();
}

export const apiAsyncProcess = (
  handler: () => Promise<void>,
  config?: { requestId?: string; silence?: boolean },
): void => {
  const processId = nanoid();
  RunningAsyncProcesses.add(processId);

  waitUntil(
    (async () => {
      await ALogger.genInit(config?.requestId ?? RequestId.get(), ExecutionEnvironment.WEB_API_ASYNC);

      const start = Date.now();
      if (!config?.silence) ALogger.info({ context: 'Async processing started', start, processId });
      try {
        await handler();
      } catch (error) {
        ALogger.error({ context: "Error in api's async processing", error });
      } finally {
        RunningAsyncProcesses.remove(processId);
        if (!config?.silence)
          ALogger.info({ context: 'Async processing completed', durationInMS: Date.now() - start, processId });
        if (!isDevelopment() && !RunningAsyncProcesses.hasAsyncProcess()) await ALogger.close();
      }
    })(),
  );
};
