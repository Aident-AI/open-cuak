'use client';

import { eventWithTime } from '@rrweb/types';
import { useEffect, useRef } from 'react';
import RrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { useLiveRecordingEvents } from '~src/hooks/useLiveRecordingEvents';

export default function LivePlayer() {
  const playerElRef = useRef<HTMLDivElement>(null);
  const player = useRef<RrwebPlayer>();

  const { events, isRecording } = useLiveRecordingEvents({
    onNewEvent: (event) => player.current?.addEvent(event as unknown as eventWithTime),
    onEventsReset: () => player.current?.getReplayer().resetCache(),
  });

  const createReplayer = () => {
    if (events.length < 2) return;
    if (player.current) destroyReplayer();

    player.current = new RrwebPlayer({
      target: playerElRef.current as HTMLElement,
      props: {
        autoPlay: false,
        events: events as unknown as eventWithTime[],
        liveMode: true,
        mouseTail: false,
        showController: false,
        useVirtualDom: true,
      },
    });

    const replayer = player.current.getReplayer();
    replayer.disableInteract();
    replayer.startLive();
  };
  const destroyReplayer = () => {
    if (!player.current) return;

    player.current.pause();
    player.current.getReplayer().destroy();
    player.current = undefined;
  };

  useEffect(() => {
    isRecording ? createReplayer() : destroyReplayer();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  useEffect(() => {
    if (events.length < 2 || !playerElRef.current || !!player.current) return;
    createReplayer();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div>
        <h1>Recorder Player</h1>
        <div ref={playerElRef} />
      </div>
    </div>
  );
}
