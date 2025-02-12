'use client';

import { useEffect, useRef, useState } from 'react';
import { Replayer } from 'rrweb';
import { BroadcastEventType } from '~shared/broadcast/types';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { RRWebEvent } from '~shared/shadow-mode/RREvent';
import { ShadowModeSession } from '~shared/shadow-mode/ShadowModeSession';
import { useBaseReplayerRuntime } from '~src/app/_hooks/replayer-runtimes/useBaseReplayerRuntime';
import { BroadcastService } from '~src/common/services/BroadcastService';

export function useLiveReplayerRuntime() {
  const { replayerRef, getMirror, getSnapshot, buildInteractable } = useBaseReplayerRuntime();

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(isRecording);
  const eventsRef = useRef<RRWebEvent[]>([]);

  const getReplayer = () => {
    if (!replayerRef.current) throw new Error('Replayer is not initialized');
    return replayerRef.current;
  };

  const appendEvent = async (event: RRWebEvent): Promise<InteractableObject.TreeNode> => {
    getReplayer().addEvent(event);
    eventsRef.current.push(event);

    const startTime = eventsRef.current[0].timestamp;
    const targetTS = event.timestamp - startTime + 1;
    return await buildInteractable(targetTS);
  };

  useEffect(() => {
    BroadcastService.subscribe<string>({ type: BroadcastEventType.SHADOW_MODE_SESSION_UPDATED }, (session) => {
      const isRecording = ShadowModeSession.fromBroadcast(session).isRecording();
      isRecordingRef.current = isRecording;
      setIsRecording(isRecording);
    });

    replayerRef.current = new Replayer([], { liveMode: true, useVirtualDom: true });
    replayerRef.current.wrapper.id = 'live-replayer';

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRecording) getReplayer().startLive();
    else {
      getReplayer().pause();
      getReplayer().resetCache();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return { isRecording, appendEvent, getMirror, getReplayer, getSnapshot };
}
