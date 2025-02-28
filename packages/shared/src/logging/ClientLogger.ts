import { NextRequest } from 'next/dist/server/web/spec-extension/request';
import { v4 as UUID } from 'uuid';
import { getExecEnv } from '~shared/env/ExecutionEnvironment';
import { getHost } from '~shared/env/environment';
import { ALoggerLevel } from '~shared/logging/ALoggerLevel';
import { BaseLogger } from '~shared/logging/BaseLogger';
import { RequestId } from '~shared/logging/RequestId';

export class ClientLogger extends BaseLogger {
  public static createForWebEdge(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || UUID();
    RequestId.set(requestId);
    return new ClientLogger();
  }

  constructor(config?: { interval?: number }) {
    super();
    this.#intervalId = setInterval(this.#sendLog, config?.interval || 1_000);
  }

  public log(level: ALoggerLevel, message: unknown, consoleLog: boolean = false) {
    if (this.#isClosed) throw new Error('Logger is closed');

    const buildEnv = process.env.NEXT_PUBLIC_BUILD_ENV;
    const requestId = RequestId.get();
    const line = { level, message, environment: getExecEnv(), createdAt: Date.now(), buildEnv, requestId };
    this.#cache.push(line);
    // eslint-disable-next-line no-console
    if (consoleLog) console.log(line);
  }

  public async close(): Promise<void> {
    this.#isClosed = true;
    clearInterval(this.#intervalId);

    if (this.#cache.length > 0) await this.#sendLog();
    if (this.#cache.length > 0) throw new Error('Failed to send log lines');
  }

  public isClosed() {
    return this.#isClosed;
  }

  #sendLog = async () => {
    if (this.#cache.length < 1) return;

    const body = JSON.stringify(this.#cache);
    if (body.length < 1) throw new Error('Failed to stringify log lines');

    try {
      const headers = { 'Content-Type': 'application/json' };
      const rsp = await fetch(getHost() + '/api/log', { method: 'POST', headers, body });

      // eslint-disable-next-line no-console
      if (!rsp.ok) console.error('Failed to log', rsp.status, rsp.statusText, rsp.url, 'lines=', this.#cache);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      this.#cache = [];
    }
  };

  #cache: unknown[] = [];
  #intervalId: NodeJS.Timeout;
  #isClosed = false;
}
