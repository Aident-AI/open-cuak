import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export enum RuntimeEnvironment {
  INJECTION = 'injection',
  POPUP = 'popup',
  SANDBOX = 'sandbox',
  SERVICE_WORKER = 'service-worker',
  SIDE_PANEL = 'side-panel',
}

export enum LogLevels {
  LOG = 'log',
  INFO = 'info',
  DEBUG = 'debug',
  WARN = 'warn',
  ERROR = 'error',
}

export class LogToConsole_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.LOG_TO_CONSOLE;

  public static description = 'Send a log line to service-worker.';

  public static requestPayloadSchema = z.object({
    environment: z.nativeEnum(RuntimeEnvironment),
    line: z.string(),
    prefix: z.string().optional(),
    level: z.nativeEnum(LogLevels).optional().default(LogLevels.LOG),
  });

  public static responsePayloadSchema = z.void();

  public static async exec(
    payload: z.infer<typeof this.requestPayloadSchema>,
    _context: IActionConfigExecContext,
  ): Promise<z.infer<typeof this.responsePayloadSchema>> {
    const { environment, line, prefix, level } = payload;
    const logLine = `${environment ? `{${environment.toUpperCase()}} ` : ''}${prefix ? `[${prefix}] ` : ''}${line}`;
    // TODO: add CSS to differentiate log environments
    console[level](logLine);
  }
}

enforceBaseActionConfigStatic(LogToConsole_ActionConfig);
