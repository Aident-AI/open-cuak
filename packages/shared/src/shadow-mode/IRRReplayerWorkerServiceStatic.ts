import { RREvent, RREventWithNanoId } from '~shared/shadow-mode/RREvent';

export interface IRRReplayerWorkerServiceStatic {
  start(): Promise<void>;
  inject(): Promise<void>;
  appendEvent(event: RREvent): Promise<void>;
  getEventsAfterNanoId(nanoId?: string): RREventWithNanoId[];
}
