import {
  CDPSession,
  CDPSessionEvent,
  CDPSessionEvents,
  CdpCDPSession,
  CommonEventEmitter,
  ConnectionTransport,
  EventType,
  EventsWithWildcard,
  Protocol,
  ProtocolMapping,
} from '@patched/puppeteer-core';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { CONNECTION_DUMMY_URL } from '~shared/puppeteer/constants';
import { EventEmitter } from '~src/scripts/sandbox/puppeteer/iframe/EventEmitter';
import mitt, { Emitter, EventHandlerMap } from '~src/scripts/sandbox/puppeteer/mitt';
import { SandboxMessagingService } from '~src/scripts/sandbox/services/SandboxMessagingService';

type Events = Record<EventType, unknown>;

export class CdpConnectionProxy
  extends EventEmitter<CDPSessionEvents>
  implements CommonEventEmitter<EventsWithWildcard<Events>>
{
  constructor(dummyTransport: ConnectionTransport, delay = 0, timeout?: number) {
    super();
    this.#transport = dummyTransport;
    this.#delay = delay;
    this.#timeout = timeout ?? 180_000;

    this.#emitter = mitt(this.#handlers);
  }

  // // ====================
  // // EventEmitter
  // // ====================
  #emitter: Emitter<Events & { '*': Events[keyof Events] }>;
  #handlers: EventHandlerMap<Events & { '*': Events[keyof Events] }> = new Map();

  public async send<T extends keyof ProtocolMapping.Commands>(
    method: T,
    ...paramArgs: ProtocolMapping.Commands[T]['paramsType']
  ): Promise<ProtocolMapping.Commands[T]['returnType']> {
    return (await this._invoke('send', [method, ...paramArgs])) as ProtocolMapping.Commands[T]['returnType'];
  }

  public dispose(): void {
    this._invoke('dispose', []);
    this.onCloseReceived();
  }

  public async createSession(targetInfo: Protocol.Target.TargetInfo): Promise<CDPSession> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rsp: any = await this._invoke('createSession', [targetInfo]);
    const session = this.#sessions.get(rsp?.id);
    if (!session) throw new Error('sessionId not found');
    return session;
  }

  public onMessageReceived(message: string) {
    if (this.#closed) return;

    const object = JSON.parse(message);
    if (object.method === 'Target.attachedToTarget') {
      const sessionId = object.params.sessionId;
      const session = new CdpCDPSession(this, object.params.targetInfo.type, sessionId, object.sessionId);
      this.#sessions.set(sessionId, session);
      this.emit(Symbol('CDPSession.Attached'), session);
      const parentSession = this.#sessions.get(object.sessionId);
      if (parentSession) {
        parentSession.emit(Symbol('CDPSession.Attached'), session);
      }
    } else if (object.method === 'Target.detachedFromTarget') {
      const session = this.#sessions.get(object.params.sessionId);
      if (session) {
        session._onClosed();
        this.#sessions.delete(object.params.sessionId);
        this.emit(CDPSessionEvent.SessionDetached, session);
        const parentSession = this.#sessions.get(object.sessionId);
        if (parentSession) {
          parentSession.emit(CDPSessionEvent.SessionDetached, session);
        }
      }
    }
    if (object.sessionId) {
      const session = this.#sessions.get(object.sessionId);
      if (session) {
        session._onMessage(object);
      }
    } else if (object.id) {
      // TODO: fix this later
      // if (object.error) {
      //   this.#callbacks.reject(object.id, createProtocolErrorMessage(object), object.error.message);
      // } else {
      //   this.#callbacks.resolve(object.id, object.result);
      // }
    } else {
      this.emit(object.method, object.params);
    }
  }

  public onCloseReceived() {
    if (this.#closed) return;
    this.#closed = true;
    this.#sessions.clear();
    this.emit(Symbol('CDPSession.Disconnected'), undefined);
  }

  public get timeout(): number {
    return this.#timeout;
  }

  public session(sessionId: string): CdpCDPSession | null {
    return this.#sessions.get(sessionId) || null;
  }

  public url(): string {
    return CONNECTION_DUMMY_URL;
  }

  public async triggerOnMessage(message: string): Promise<void> {
    this.onMessageReceived(message);
  }

  #sessions = new Map<string, CdpCDPSession>();
  #transport: ConnectionTransport;
  #delay: number;
  #timeout: number;
  #closed = false;

  private async _invoke(method: string, params: unknown[]) {
    return await SandboxMessagingService.sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.OBJECT_FUNCTION_EVAL,
      payload: { object: 'CdpConnectionProxyClient.connection', method, params },
    });
  }
}
