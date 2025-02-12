'use client';

import { useEffect } from 'react';
import { ExecutionEnvironment, setExecEnv } from '~shared/env/ExecutionEnvironment';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { SidePanelMessage } from '~shared/messaging/side-panel/types';
import ExtensionPage from '~src/app/_components/ExtensionPage';
import { useLiveReplayerRuntime } from '~src/app/_hooks/useLiveReplayerRuntime';
import { useSessionReplayerRuntime } from '~src/app/_hooks/useSessionReplayerRuntime';
import { loadConfigJson } from '~src/common/loadConfigJson';
import { MessageListener } from '~src/common/messaging/MessageListener';
import { SidePanelMessageHandler, SidePanelMessageHandlerContext } from '~src/common/messaging/SidePanelMessageHandler';

export default function SidePanelPage() {
  useEffect(() => {
    void setExecEnv(ExecutionEnvironment.EXTENSION_SIDE_PANEL);
    void loadConfigJson('../../config.json');
  }, []);

  const liveReplayer = useLiveReplayerRuntime();
  const sessionReplayer = useSessionReplayerRuntime();

  useEffect(() => {
    const context = { liveReplayer, sessionReplayer } as SidePanelMessageHandlerContext;
    new MessageListener<SidePanelMessage>(RuntimeMessageReceiver.SIDE_PANEL, SidePanelMessageHandler(context)).start();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ExtensionPage isPopup={false} />;
}
