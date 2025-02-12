'use client';

import { Replayer } from 'rrweb';
import { RRWebEvent } from '~shared/shadow-mode/RREvent';
import { ShadowModeEvent } from '~shared/shadow-mode/ShadowModeEvent';
import { useBaseReplayerRuntime } from '~src/app/_hooks/replayer-runtimes/useBaseReplayerRuntime';

export function useSessionReplayerRuntime() {
  const { replayerRef, getReplayer, getMirror, getSnapshot, buildInteractable } = useBaseReplayerRuntime();

  const generateShadowModeEvents = async (events: RRWebEvent[]): Promise<ShadowModeEvent[]> => {
    if (!events || events.length < 1) throw new Error('No events to generate shadow-mode events');
    replayerRef.current = new Replayer(events, { liveMode: false, useVirtualDom: true });
    replayerRef.current.wrapper.id = 'session-replayer';

    let prev: ShadowModeEvent | undefined;
    const shadowEvents = [] as ShadowModeEvent[];
    const startTime = events[0].timestamp;
    for (const e of events) {
      const targetTS = e.timestamp - startTime + 1;
      const it = await buildInteractable(targetTS);
      const event = ShadowModeEvent.buildFromRREvent(e, it, prev);
      if (!event) continue;

      shadowEvents.push(event);
      prev = event;
    }

    getReplayer().destroy();
    replayerRef.current = undefined;
    return shadowEvents;
  };

  return { getMirror, getReplayer, getSnapshot, buildInteractable, generateShadowModeEvents };
}
