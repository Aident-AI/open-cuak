import { useEffect, useRef, useState } from 'react';
import { BroadcastEventType } from '~shared/broadcast/types';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RREventWithNanoId } from '~shared/shadow-mode/RREvent';
import { ShadowModeSession } from '~shared/shadow-mode/ShadowModeSession';
import { useBroadcastService } from './useBroadcastService';
import { useExtensionService } from './useExtensionService';

export interface UseLiveRecordingEventsConfig {
  onNewEvent?: (event: RREventWithNanoId) => void | Promise<void>;
  onEventsReset?: () => void | Promise<void>;
}

export function useLiveRecordingEvents({ onNewEvent, onEventsReset }: UseLiveRecordingEventsConfig = {}) {
  const { subscribe } = useBroadcastService();
  const { sendRuntimeMessage } = useExtensionService();

  const [events, setEvents] = useState([] as RREventWithNanoId[]);
  const [isRecording, setIsRecording] = useState(false);

  const isFetchingEvents = useRef(false);
  const newEventDuringFetching = useRef(false);

  useEffect(() => {
    subscribe({ type: BroadcastEventType.SHADOW_MODE_SESSION_UPDATED }, (session) =>
      setIsRecording(ShadowModeSession.fromBroadcast(session as string).isRecording()),
    );

    subscribe({ type: BroadcastEventType.LIVE_RECORDING_EVENT_RECEIVED }, async (ts: unknown) => {
      if ((ts as number) < 0) {
        setEvents([]);
        onEventsReset?.();
        return;
      }

      if (isFetchingEvents.current) {
        newEventDuringFetching.current = true;
        return;
      }
      isFetchingEvents.current = true;

      const fetchNewEvents = async () => {
        const cursor = events[events.length - 1]?.nanoId;
        const response = await sendRuntimeMessage<RREventWithNanoId[]>({
          receiver: RuntimeMessageReceiver.SERVICE_WORKER,
          action: ServiceWorkerMessageAction.FETCH_LIVE_RECORDING_EVENTS,
          payload: { cursor },
        });
        if (!response.success) throw response.error;
        if (!response.data) throw new Error('No events received');

        const newEvents = response.data as RREventWithNanoId[];
        if (newEvents.length < 1) return;

        setEvents(events.concat(newEvents));
        newEvents.forEach((e) => onNewEvent?.(e));
      };

      await fetchNewEvents();
      if (newEventDuringFetching.current) await fetchNewEvents();
      isFetchingEvents.current = false;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, isFetchingEvents: isFetchingEvents.current, isRecording };
}
