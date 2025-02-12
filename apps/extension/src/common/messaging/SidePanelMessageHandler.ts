import { SidePanelMessage, SidePanelMessageAction } from '~shared/messaging/side-panel/types';
import { RRWebEvent } from '~shared/shadow-mode/RREvent';
import { useLiveReplayerRuntime } from '~src/app/_hooks/useLiveReplayerRuntime';
import { useSessionReplayerRuntime } from '~src/app/_hooks/useSessionReplayerRuntime';
import { MessageRequestHandler } from '~src/common/messaging/MessageListener';

export type SidePanelMessageHandlerContext = {
  liveReplayer: ReturnType<typeof useLiveReplayerRuntime>;
  sessionReplayer: ReturnType<typeof useSessionReplayerRuntime>;
};

export const SidePanelMessageHandler: (
  context: SidePanelMessageHandlerContext,
) => MessageRequestHandler<SidePanelMessage> =
  (context: SidePanelMessageHandlerContext) => async (message, _sender, sendResponse) => {
    switch (message.action) {
      case SidePanelMessageAction.PING: {
        sendResponse.success({ data: 'pong' });
        break;
      }

      // replayer
      case SidePanelMessageAction.LIVE_REPLAYER_APPEND_EVENT: {
        const it = await context.liveReplayer.appendEvent(message.payload);
        sendResponse.success({ it });
        break;
      }
      case SidePanelMessageAction.LIVE_REPLAYER_FETCH_SNAPSHOT: {
        sendResponse.success({ snapshot: context.liveReplayer.getSnapshot() });
        break;
      }
      case SidePanelMessageAction.SESSION_REPLAYER_GENERATE_SHADOW_MODE_EVENTS: {
        // TODO: parse payload
        const rrwebEvents = message.payload as RRWebEvent[];
        const events = await context.sessionReplayer.generateShadowModeEvents(rrwebEvents);
        sendResponse.success({ events: events.map((e) => e.toJSON()) });
        break;
      }

      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  };
