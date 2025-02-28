import { Mutex } from 'async-mutex';
import { DEBUGGER_VERSION, DebuggerCommand } from '~shared/chrome/Debuggee';
import { ALogger } from '~shared/logging/ALogger';
import { IConnectionTransport } from '~shared/puppeteer/IConnectionTransport';
import { ErrorTransformation } from '~shared/utils/ErrorTransformation';
import { ChromeExtensionSupportedDomains } from '~src/common/puppeteer/override/transport/ChromeExtensionSupportedDomains';
import { KnownCdpErrorCodeSet, TransportError } from '~src/common/puppeteer/override/transport/TransportError';

/**
 * This is an override for puppeteer's WebSocketTransport.
 *
 * We replace CDP connection through WS in puppeteer with Chrome Extension's chrome.debugger API.
 *
 */
export class ChromeExtensionTransport implements IConnectionTransport {
  constructor(
    public readonly targetTabId: number,
    public readonly sessionId: string,
  ) {}

  public onmessage?: (message: string) => void;
  public onclose?: () => void;

  public async connect(): Promise<void> {
    if (!chrome.debugger) throw new Error('chrome.debugger API not available');

    const release = await this.#mutex.acquire();
    try {
      if (this.isConnected()) return;

      await chrome.debugger.attach(this.#getDebuggee(), DEBUGGER_VERSION);
      if (chrome.runtime.lastError) throw new TransportError(chrome.runtime.lastError);
      this.#connected = true;
      // eslint-disable-next-line no-console
      console.info('[ChromeExtensionTransport] attached', this.targetTabId);
    } catch (error) {
      throw new Error(`Failed to attach to tab ${this.targetTabId}: ${error}`);
    } finally {
      release();
    }
  }

  public async disconnect(): Promise<void> {
    if (!chrome.debugger) throw new Error('chrome.debugger API not available');

    const release = await this.#mutex.acquire();
    try {
      if (!this.isConnected()) return;

      await chrome.debugger.detach(this.#getDebuggee());
      if (chrome.runtime.lastError) throw new TransportError(chrome.runtime.lastError);
      this.#connected = false;
      // eslint-disable-next-line no-console
      console.info('[ChromeExtensionTransport] detached', this.targetTabId);
    } catch (error) {
      ALogger.error({ context: 'encountered error', stack: ChromeExtensionTransport, error });
      throw new Error(`Failed to detach from tab ${this.targetTabId}: ${error}`);
    } finally {
      release();
    }
  }

  public isConnected(): boolean {
    return this.#connected;
  }

  public close(): void {
    if (!this.isConnected()) return;
    void this.disconnect();
  }

  public send(stringifiedMessage: string): void {
    const { method, params, ...rest } = JSON.parse(stringifiedMessage);
    if (!method) throw new Error('Invalid command: method not found');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [domain, _action] = method.split('.');
    const responseMessage = { method, params, ...rest };
    if (!ChromeExtensionSupportedDomains.has(domain)) {
      if (this.onmessage) this.onmessage.call(null, JSON.stringify({ ...responseMessage }));
      return;
    }

    const command = { method, debuggee: this.#getDebuggee(), params };

    const sendCommand = async (command: DebuggerCommand) => {
      const { debuggee: commandDebuggee, method, params = {} } = command;
      const target = commandDebuggee?.tabId || this.targetTabId;
      if (!target) throw new Error('No definite target tab');
      const debuggee = { tabId: target };
      try {
        if (!this.isConnected()) await this.connect();

        const response = await chrome.debugger?.sendCommand(debuggee, method, params);
        // eslint-disable-next-line no-console
        console.debug('[ChromeExtensionTransport] sendCommand', { debuggee, method, params, response });
        if (!response) throw new Error('Failed to send command');
        if (chrome.runtime.lastError) throw new TransportError(chrome.runtime.lastError);

        return response;
      } catch (error) {
        ALogger.error({ context: 'encountered error', stack: 'ChromeExtensionTransport', error });
      }
    };

    void sendCommand(command)
      .then(async (response) => {
        const rsp = { ...responseMessage, result: response };
        if (this.onmessage) this.onmessage.call(null, JSON.stringify(rsp));
      })
      .catch(async (error) => {
        if (error instanceof TransportError) {
          const code = (error as TransportError).code;
          if (code && KnownCdpErrorCodeSet.has(code)) {
            // eslint-disable-next-line no-console
            console.warn('[ChromeExtensionTransport] known error', error);
            const errorObject = ErrorTransformation.convertErrorToObject(error);
            this.onmessage?.call(null, JSON.stringify({ ...responseMessage, error: errorObject }));
            return;
          }
        }
        if (error.message.includes('Debugger is not attached to the tab with id')) {
          // eslint-disable-next-line no-console
          console.warn('[ChromeExtensionTransport] encountered error. retry re-connecting', error.message);
          this.close();
          await this.connect();
        }

        const rsp = JSON.stringify({ ...responseMessage, error: ErrorTransformation.convertErrorToObject(error) });
        // eslint-disable-next-line no-console
        console.error('[ChromeExtensionTransport] retry count exceeded - aborting. error=', error);
        if (this.onmessage) this.onmessage.call(null, rsp);
        return;
      });
  }

  #connected = false;
  #mutex = new Mutex();

  #getDebuggee() {
    return { tabId: this.targetTabId };
  }
}
