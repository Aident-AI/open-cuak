import { nanoid } from 'nanoid';
import { BroadcastEventType } from '~shared/broadcast/types';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { IRRReplayerWorkerServiceStatic } from '~shared/shadow-mode/IRRReplayerWorkerServiceStatic';
import { RREvent, RREventWithNanoId } from '~shared/shadow-mode/RREvent';
import { ShadowModeSession } from '~shared/shadow-mode/ShadowModeSession';
import { enforceStatic } from '~shared/utils/EnforceStatic';
import { AvailableInInterpreter, AvailableInInterpreterWithOriginalName } from '~src/common/decorators';
import { BroadcastService } from '~src/common/services/BroadcastService';

@AvailableInInterpreterWithOriginalName('RRReplayerWorkerService')
export class RRReplayerWorkerService {
  public static async start(): Promise<void> {
    if (this._instance) return;

    this._instance = new RRReplayerWorkerService();
    BroadcastService.subscribe<string>({ type: BroadcastEventType.SHADOW_MODE_SESSION_UPDATED }, async (data) => {
      this._getInstance().#isRecording = ShadowModeSession.fromBroadcast(data).isRecording();
      if (!this._getInstance().#isRecording) {
        this._instance.#events = [];
        this._instance.#nanoIdToIndex = {};
        await BroadcastService.send({ type: BroadcastEventType.LIVE_RECORDING_EVENT_RECEIVED }, -1);
      }
    });
  }

  public static async inject(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public static async appendEvent(event: RREvent): Promise<void> {
    this._getInstance().addEvent(event);
    await BroadcastService.send({ type: BroadcastEventType.LIVE_RECORDING_EVENT_RECEIVED });
  }

  @AvailableInInterpreter
  public static getEventsAfterNanoId(nanoId?: string): RREventWithNanoId[] {
    if (!nanoId) return this._getInstance().events;

    const index = this._instance.#nanoIdToIndex[nanoId];
    if (index === undefined) throw new Error('No such nanoId');
    return this._instance.events.slice(index + 1);
  }

  @AvailableInInterpreter
  public static isRecording(): boolean {
    return this._getInstance().#isRecording;
  }

  @AvailableInInterpreter
  public static async startRecorder(): Promise<void> {
    await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.START_SHADOW_MODE,
    });
  }

  @AvailableInInterpreter
  public static async stopRecorder(): Promise<void> {
    await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.STOP_SHADOW_MODE,
    });
  }

  private static _instance: RRReplayerWorkerService;

  private static _getInstance(): RRReplayerWorkerService {
    if (!this._instance) throw new Error('RRReplayInstance not initialized');
    return this._instance;
  }

  private constructor() {}

  public get events(): RREventWithNanoId[] {
    return this.#events;
  }

  public addEvent(event: object) {
    const newIndex = this.#events.length;
    const nanoId = nanoid();
    this.#events.push({ ...event, nanoId });
    this.#nanoIdToIndex[nanoId] = newIndex;
  }

  #events: RREventWithNanoId[] = [];
  #isRecording = false;
  #nanoIdToIndex: Record<string, number> = {};
}

enforceStatic<IRRReplayerWorkerServiceStatic>(RRReplayerWorkerService);
