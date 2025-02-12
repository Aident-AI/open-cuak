export type WaitUtilConfig = { timeout?: number; interval?: number; timeoutCallback?: () => void | Promise<void> };

export type RetryResponse<T> =
  | {
      success: true;
      data?: T;
    }
  | {
      success: false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

export class WaitUtils {
  public static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static async waitUntil(condition: () => boolean | Promise<boolean>, config?: WaitUtilConfig): Promise<void> {
    const {
      timeout = 30_000,
      interval = 100,
      timeoutCallback = () => {
        throw new Error('timeout');
      },
    } = config ?? {};

    const now = Date.now();
    while (!(await condition())) {
      const elapsed = Date.now() - now;
      if (elapsed > timeout) {
        timeoutCallback();
        return;
      }

      await WaitUtils.wait(interval);
    }
  }

  public static async delayToThrow(ms: number, error?: Error): Promise<never> {
    return new Promise((_resolve, reject) =>
      setTimeout(() => reject(error ?? new Error('time out: ' + ms + 'ms')), ms),
    );
  }

  public static async waitUntilRetry<T>(
    exec: () => Promise<RetryResponse<T>>,
    interval: number = 100,
    maxRetry = 20,
    unretryableErrorTypes?: Set<string>,
  ): Promise<RetryResponse<T>> {
    return new Promise((resolve) => {
      const execWithRetryWait = async (retryCount = 0): Promise<void> => {
        const response = await exec();
        if (response.success) {
          resolve(response);
          return;
        }

        if (unretryableErrorTypes?.has(response.error)) {
          // eslint-disable-next-line no-console
          console.error('Error not retryable:', response.error);
          resolve(response);
          return;
        }

        // eslint-disable-next-line no-console
        console.error('Exec failed:', response.error, 'Retry count:', retryCount);
        if (retryCount >= maxRetry) {
          // eslint-disable-next-line no-console
          console.error('Max retry count reached');
          resolve(response);
          return;
        }

        setTimeout(() => execWithRetryWait(retryCount + 1), interval);
      };

      execWithRetryWait();
    });
  }
}
