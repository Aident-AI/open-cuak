import { v4 as uuid } from 'uuid';
import { BroadcastEventType } from '~shared/broadcast/types';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { IShadowModeWorkerServiceStatic } from '~shared/shadow-mode/IShadowModeWorkerServiceStatic';
import { RREvent, RRWebEvent } from '~shared/shadow-mode/RREvent';
import { ShadowModeEvent } from '~shared/shadow-mode/ShadowModeEvent';
import { ShadowModeSession, ShadowModeStatus } from '~shared/shadow-mode/ShadowModeSession';
import { enforceStatic } from '~shared/utils/EnforceStatic';
import { BroadcastService } from '~src/common/services/BroadcastService';

export class ShadowModeWorkerService {
  public static async start(): Promise<void> {
    BroadcastService.subscribe<string>({ type: BroadcastEventType.SHADOW_MODE_SESSION_UPDATED }, async (data) => {
      this.#session = ShadowModeSession.fromBroadcast(data);
    });
    await this.#publicSessionUpdate(this.#session);
  }

  public static async inject(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public static get instance() {
    throw new Error('Method not implemented.');
  }

  public static async startShadowMode(): Promise<void> {
    await this.#publicSessionUpdate(ShadowModeSession.init(uuid()));
  }

  public static async stopShadowMode(): Promise<void> {
    await this.#publicSessionUpdate({ ...this.#session, status: ShadowModeStatus.ANALYZING } as ShadowModeSession);
  }

  public static async completeAnalysis(): Promise<void> {
    await this.#publicSessionUpdate(ShadowModeSession.init());
    this.#events = [];
  }

  public static async appendEvent(event: RREvent, it: InteractableObject.TreeNode): Promise<void> {
    if (!event.uuid) throw new Error('Event must have a uuid');

    const prev = this.#events[this.#events.length - 1];
    const shadowEvent = ShadowModeEvent.buildFromRREvent(event as RRWebEvent, it, prev);
    if (!shadowEvent) return;

    await BroadcastService.send({ type: BroadcastEventType.SHADOW_EVENT_APPENDED });
    this.#events.push(shadowEvent);
  }

  public static getSession(): ShadowModeSession {
    return this.#session;
  }

  public static getEvents(): ShadowModeEvent[] {
    return this.#events;
  }

  static #session = ShadowModeSession.init();
  static #events: ShadowModeEvent[] = [];

  static async #publicSessionUpdate(session: ShadowModeSession): Promise<void> {
    await BroadcastService.send({ type: BroadcastEventType.SHADOW_MODE_SESSION_UPDATED }, JSON.stringify(session));
  }
}

enforceStatic<IShadowModeWorkerServiceStatic>(ShadowModeWorkerService);
