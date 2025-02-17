/* eslint-disable no-fallthrough */
import { ZodVoid } from 'zod';
import { getHost } from '~shared/env/environment';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { Untyped_ActionConfig } from '~shared/messaging/action-configs/Untyped.ActionConfig';
import { ActionConfigRegistry, getActionConfig } from '~shared/messaging/action-configs/registry';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ServiceWorkerMessage } from '~shared/messaging/service-worker/types';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';
import { ErrorTransformation } from '~shared/utils/ErrorTransformation';
import { Interactable } from '~src/common/interactable/Interactable';
import { InteractableService } from '~src/common/interactable/InteractableService';
import { MessageListener, MessageResponder, MessageResponseHandler } from '~src/common/messaging/MessageListener';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { UserSessionService } from '~src/common/services/UserSessionService';
import { InterpreterService } from '~src/common/services/interpreter/InterpreterService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';
import { ChatgptTabService } from '~src/common/services/tab/ChatgptTabService';
import { ClassNameMapping, invokeStaticMethod } from '~src/scripts/sandbox/puppeteer/service-worker/ClassNameMapping';
import {
  EvalObjectMapping,
  invokeInstanceMethod,
} from '~src/scripts/sandbox/puppeteer/service-worker/EvalObjectMapping';
import { ActionConfigExecContext } from '~src/scripts/service-worker/ActionConfigExecContext';
import {
  SendChatGPTMessage,
  sendChatGPTMessage,
} from '~src/scripts/service-worker/message/handlers/sendChatGPTMessage';

export class ServiceWorkerMessageHandler {
  public static start() {
    const listener = new MessageListener<ServiceWorkerMessage>(
      RuntimeMessageReceiver.SERVICE_WORKER,
      this._prepareRequestHandler,
      this._prepareResponseHandler,
    );
    listener.start();
  }

  public static async processMessage(message: ServiceWorkerMessage, sender: chrome.runtime.MessageSender = {}) {
    return await new Promise<RuntimeMessageResponse>((resolve, reject) => {
      try {
        const respond = (response: RuntimeMessageResponse) => resolve(response);
        const sendResponse = this._prepareResponseHandler(respond, message, sender);
        this._prepareRequestHandler(message, sender, sendResponse);
      } catch (error) {
        reject(error);
      }
    });
  }

  private static async _prepareRequestHandler(
    message: ServiceWorkerMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: MessageResponder,
  ) {
    const { success: sendSuccessResponse, failure: sendFailureResponse } = sendResponse;
    const { payload: rawPayload } = message;

    const requestSchema =
      ActionConfigRegistry[message.action] === Untyped_ActionConfig
        ? RuntimeMessage.RequestPayload.Schema[message.action]
        : getActionConfig(message.action).requestPayloadSchema;
    const result = requestSchema.safeParse(rawPayload);
    if (!result.success) {
      ALogger.error({ action: message.action, data: rawPayload, result });
      sendFailureResponse(new Error(`Invalid request payload for action: ${message.action}`));
      return;
    }
    const payload = result.data;
    const targetTabId: number | undefined =
      payload?.tabId ?? sender.tab?.id ?? ActiveTabService.getInServiceWorker()?.id;
    ALogger.debug({ context: 'Received message', stack: 'ServiceWorkerMessageHandler', message, sender, targetTabId });

    type RequestPayloadType = RuntimeMessage.RequestPayload.Type;
    try {
      switch (message.action as ServiceWorkerMessageAction) {
        case ServiceWorkerMessageAction.GO_LOGIN: {
          await chrome.tabs?.create({ url: getHost() + '/login?target=' + (payload?.target ?? '/companion') });
          break;
        }
        case ServiceWorkerMessageAction.GET_USER_SESSION: {
          sendSuccessResponse(UserSessionService.userSession);
          return;
        }
        case ServiceWorkerMessageAction.OPEN_POPUP: {
          await chrome.windows.create(payload as chrome.windows.CreateData);
          break;
        }
        case ServiceWorkerMessageAction.OPEN_SIDE_PANEL: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (chrome.sidePanel as any).open({ tabId: sender.tab?.id });
          await chrome.sidePanel.setOptions({
            tabId: sender.tab?.id,
            path: 'side-panel.html',
            enabled: true,
          });
          break;
        }
        case ServiceWorkerMessageAction.GET_ALL_TARGET_INFO: {
          const targets = await chrome.debugger.getTargets();
          sendSuccessResponse(targets);
          return;
        }

        case ServiceWorkerMessageAction.PING:
        case ServiceWorkerMessageAction.CLOSE:
        case ServiceWorkerMessageAction.CACHE_COOKIES:
        case ServiceWorkerMessageAction.CURRENT_CURSOR_TYPE:

        // Tab
        case ServiceWorkerMessageAction.GET_CURRENT_TAB:
        case ServiceWorkerMessageAction.GET_ACTIVE_TAB:
        case ServiceWorkerMessageAction.GET_TAB_BY_ID:
        case ServiceWorkerMessageAction.CHECK_CURRENT_TAB_IS_ACTIVE:

        // Browser Actions
        case ServiceWorkerMessageAction.CLOSE_TAB:
        case ServiceWorkerMessageAction.HIGHLIGHT_TABS:
        case ServiceWorkerMessageAction.OPEN_NEW_TAB:
        case ServiceWorkerMessageAction.OPEN_NEW_WINDOW:
        case ServiceWorkerMessageAction.QUERY_TABS:

        // Page Actions
        case ServiceWorkerMessageAction.FETCH_FULL_PAGE:
        case ServiceWorkerMessageAction.INTERACT_PAGE:
        case ServiceWorkerMessageAction.NAVIGATE_PAGE:
        case ServiceWorkerMessageAction.READ_SCREEN:
        case ServiceWorkerMessageAction.SCREENSHOT:
        case ServiceWorkerMessageAction.FETCH_COMPONENT_BOUNDING_BOX:
        case ServiceWorkerMessageAction.WAIT_FOR_PAGE:

        // Control Actions
        case ServiceWorkerMessageAction.KEYBOARD_TYPE:
        case ServiceWorkerMessageAction.MOUSE_CLICK:
        case ServiceWorkerMessageAction.MOUSE_MOVE:
        case ServiceWorkerMessageAction.MOUSE_RESET:
        case ServiceWorkerMessageAction.MOUSE_WHEEL:

        // Portal Actions
        case ServiceWorkerMessageAction.PORTAL_MOUSE_CONTROL:

        // Recorder
        case ServiceWorkerMessageAction.FETCH_LIVE_RECORDING_EVENTS:
        case ServiceWorkerMessageAction.FETCH_BACKEND_NODE_ID_FOR_DOM_TREE:
        case ServiceWorkerMessageAction.BUILD_INTERACTABLE_FOR_SNAPSHOT:

        // Shadow Mode
        case ServiceWorkerMessageAction.START_SHADOW_MODE:
        case ServiceWorkerMessageAction.STOP_SHADOW_MODE:
        case ServiceWorkerMessageAction.COMPLETE_ANALYSIS:
        case ServiceWorkerMessageAction.FETCH_SHADOW_EVENTS:

        // Interactable
        case ServiceWorkerMessageAction.ATTACH_INTERACTABLE:
        case ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_BY_SNAPSHOT_NANOID: {
          // TODO: migrate all actions to adopt action-config pattern
          const config = getActionConfig(message.action);
          if (config instanceof Untyped_ActionConfig) throw new Error('Untyped action config not supported');

          const context = ActionConfigExecContext.instance;
          const isVoid = config.responsePayloadSchema instanceof ZodVoid;

          if (isVoid) {
            await config.exec(payload, context, sender);
            sendSuccessResponse();
          } else {
            const output = await config.exec(payload, context, sender);
            const data = config.responsePayloadSchema.parse(output);
            sendSuccessResponse(data);
          }
          return;
        }

        // Interactable
        case ServiceWorkerMessageAction.REFRESH_INTERACTABLE: {
          sendSuccessResponse(); // send early response to prevent blocking

          if (!InteractableService.isAttached()) await InteractableService.attach();
          const emptyReason = InteractableService.getEmptyPageReason();
          if (emptyReason) {
            ALogger.warn({ context: 'Empty page reason.', stack: 'Interactable', emptyReason });
            return;
          }

          const startAt = Date.now();
          await InteractableService.refresh();
          const endAt = Date.now();
          ALogger.debug({ context: `Interactable refreshed in ${endAt - startAt}ms`, stack: 'Interactable' });
          return;
        }
        case ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_DICT: {
          if (!InteractableService.isAttached()) await InteractableService.attach();
          const it = await fetchActiveTabInteractable();
          const nodeDict = Object.values(it.getNodeDict()).reduce(
            (acc, node) => {
              acc[node.iNodeId] = node.toObject();
              return acc;
            },
            {} as Record<string, InteractableObject.Node>,
          );
          sendSuccessResponse({ nodeDict, updatedAt: it.updatedAt });
          return;
        }
        case ServiceWorkerMessageAction.FETCH_INTERACTABLE_TREE: {
          // TODO: [bootcamp] move this logic to FetchInteractableTree ActionConfig
          if (!InteractableService.isAttached()) await InteractableService.attach();
          if (InteractableService.getEmptyPageReason()) {
            const data = { emptyReason: InteractableService.getEmptyPageReason() };
            sendSuccessResponse(data);
            return;
          }
          const it = await fetchActiveTabInteractable();
          if (!it) throw new Error('Failed to fetch interactable');
          const { nodeId, config } = payload as RequestPayloadType[ServiceWorkerMessageAction.FETCH_INTERACTABLE_TREE];
          const tree = await it.fetchNodeTree(nodeId, config);
          if (!tree) throw new Error('Failed to get node tree');
          sendSuccessResponse({ tree });
          return;
        }

        // ChatGPT
        case ServiceWorkerMessageAction.GET_CHATGPT_TAB_ID: {
          const tab = ChatgptTabService.getInServiceWorker();
          sendSuccessResponse(tab?.id);
          return;
        }
        case ServiceWorkerMessageAction.OPEN_CHATGPT_TAB: {
          const tab = await ChatgptTabService.open();
          sendSuccessResponse(tab.id);
          return;
        }
        case ServiceWorkerMessageAction.SEND_CHATGPT_MESSAGE: {
          await sendChatGPTMessage(message as SendChatGPTMessage);
          break;
        }

        // Sandbox Forwarder
        case ServiceWorkerMessageAction.STATIC_FUNCTION_EVAL: {
          const { className, method, params } = payload;
          // eslint-disable-next-line no-console
          console.debug('[Sandbox Forwarder] Static function eval', { className, method, params });
          const targetClass = ClassNameMapping[className as keyof typeof ClassNameMapping];
          if (!targetClass) throw new Error('Unknown class');
          await invokeStaticMethod(targetClass, method, params);
          break;
        }
        case ServiceWorkerMessageAction.OBJECT_FUNCTION_EVAL: {
          const { object, method, params } = payload;
          // eslint-disable-next-line no-console
          console.debug('[Sandbox Forwarder] Object function eval', { object, method, params });
          const target = EvalObjectMapping[object as keyof typeof EvalObjectMapping];
          if (!target) throw new Error('Unknown class');
          await invokeInstanceMethod(target, method, params);
          break;
        }

        // TS Interpreter
        case ServiceWorkerMessageAction.INTERPRET_LINE:
        case ServiceWorkerMessageAction.INTERPRET_ONE_OFF_LINE: {
          const shouldReset = message.action === ServiceWorkerMessageAction.INTERPRET_ONE_OFF_LINE;
          try {
            const rsp = await InterpreterService.interpretLine(payload, shouldReset);
            sendSuccessResponse(rsp);
            return;
          } catch (e) {
            ALogger.error({ context: 'Interpreter error', stack: 'ServiceWorkerMessageHandler', error: e });
            sendFailureResponse(e as Error);
            return;
          }
        }
        case ServiceWorkerMessageAction.INTERPRETER_RELOAD: {
          await InterpreterService.reload();
          sendSuccessResponse();
          return;
        }

        // Broadcast Service
        case ServiceWorkerMessageAction.BROADCAST_SEND: {
          await BroadcastService.send(payload.event, payload.value);
          sendSuccessResponse({ success: true });
          break;
        }
        case ServiceWorkerMessageAction.BROADCAST_FETCH: {
          const data = await BroadcastService.fetch(payload.event);
          sendSuccessResponse(data);
          return;
        }

        default:
          throw new Error(`Unknown action: ${message.action}`);
      }
    } catch (error: unknown) {
      const errorObj = ErrorTransformation.convertErrorToObject(error as Error);
      ALogger.error({ context: 'Failed to handle service-worker message action', message, error: errorObj });
      sendFailureResponse(error as Error);
      return;
    }
    sendSuccessResponse();
  }

  private static _prepareResponseHandler: MessageResponseHandler<ServiceWorkerMessage> = (sendResponse, message) => ({
    success: (data?: unknown) => {
      const payloadSchema = RuntimeMessage.ResponsePayload.Schema[message.action as ServiceWorkerMessageAction];
      const result = payloadSchema.safeParse(data);
      if (!result.success) {
        ALogger.error({ action: message.action, response: data, parsingResult: result });
        throw new Error(`Invalid response payload for action: ${message.action}`);
      }
      const rsp = { success: true, data: result.data } as RuntimeMessageResponse;
      // eslint-disable-next-line no-console
      console.debug('[ServiceWorkerMessageHandler] Sending response=', rsp);
      sendResponse(rsp);
    },
    failure: (error?: unknown) => sendResponse({ success: false, error: (error as Error).message }),
  });
}

export const fetchActiveTabInteractable = async (): Promise<Interactable.Dom> => {
  if (!InteractableService.isAttached()) await InteractableService.attach();
  const result = await InteractableService.createInteractableForActiveTabOrThrow();
  if (!result.success) throw new Error(result.reason);
  return result.interactable as Interactable.Dom;
};
