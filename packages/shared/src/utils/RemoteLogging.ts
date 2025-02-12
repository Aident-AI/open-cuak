import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { LogLevels, RuntimeEnvironment } from '~shared/messaging/action-configs/LogToConsole.ActionConfig';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class RemoteLogging {
  public static log(...args: any[]) {
    void this.send(LogLevels.LOG, args.map((a) => JSON.stringify(a)).join(' '));
  }

  public static info(...args: any[]) {
    void this.send(LogLevels.INFO, args.map((a) => JSON.stringify(a)).join(' '));
  }

  public static debug(...args: any[]) {
    void this.send(LogLevels.DEBUG, args.map((a) => JSON.stringify(a)).join(' '));
  }

  public static warn(...args: any[]) {
    void this.send(LogLevels.WARN, args.map((a) => JSON.stringify(a)).join(' '));
  }

  public static error(...args: any[]) {
    void this.send(LogLevels.ERROR, args.map((a) => JSON.stringify(a)).join(' '));
  }

  private static async send(level: LogLevels, message: string, prefix?: string): Promise<void> {
    const environment = RuntimeEnvironment.INJECTION;
    const line = prefix ? `[${prefix}] ${message}` : message;
    await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.LOG_TO_CONSOLE,
      payload: { environment, line, level },
    });
  }
}
