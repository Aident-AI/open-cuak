import { CacheCookies_ActionConfig } from '~shared/messaging/action-configs/CacheCookies.ActionConfig';
import { Close_ActionConfig } from '~shared/messaging/action-configs/Close.ActionConfig';
import { FetchBackendNodeIdForDomTree_ActionConfig } from '~shared/messaging/action-configs/FetchBackendNodeIdForDomTree.ActionConfig';
import { FetchCurrentCursorType_ActionConfig } from '~shared/messaging/action-configs/FetchCurrentCursorType.ActionConfig';
import { FetchLiveRecordingEvents_ActionConfig } from '~shared/messaging/action-configs/FetchLiveRecordingEvents.ActionConfig';
import { LogToConsole_ActionConfig } from '~shared/messaging/action-configs/LogToConsole.ActionConfig';
import { Ping_ActionConfig } from '~shared/messaging/action-configs/Ping.ActionConfig';
import { Untyped_ActionConfig } from '~shared/messaging/action-configs/Untyped.ActionConfig';
import { CloseTab_ActionConfig } from '~shared/messaging/action-configs/browser-actions/CloseTab.ActionConfig';
import { HighlightTabs_ActionConfig } from '~shared/messaging/action-configs/browser-actions/HighlightTabs.ActionConfig';
import { OpenNewTab_ActionConfig } from '~shared/messaging/action-configs/browser-actions/OpenNewTab.ActionConfig';
import { OpenNewWindow_ActionConfig } from '~shared/messaging/action-configs/browser-actions/OpenNewWindow.ActionConfig';
import { QueryTabs_ActionConfig } from '~shared/messaging/action-configs/browser-actions/QueryTabs.ActionConfig';
import { KeyboardType_ActionConfig } from '~shared/messaging/action-configs/control-actions/KeyboardType.ActionConfig';
import { MouseClick_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseClick.ActionConfig';
import { MouseMove_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseMove.ActionConfig';
import { MouseReset_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseReset.ActionConfig';
import { MouseWheel_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseWheel.ActionConfig';
import { AttachInteractable_ActionConfig } from '~shared/messaging/action-configs/interactable/AttachInteractable.ActionConfig';
import { BuildInteractableForSnapshot_ActionConfig } from '~shared/messaging/action-configs/interactable/BuildInteractableForSnapshot.ActionConfig';
import { FetchInteractableNodeBySnapshotId_ActionConfig } from '~shared/messaging/action-configs/interactable/FetchInteractableNodeBySnapshotId.ActionConfig';
import { FetchInteractableNodeDict_ActionConfig } from '~shared/messaging/action-configs/interactable/FetchInteractableNodeDict.ActionConfig';
import { FetchInteractableTree_ActionConfig } from '~shared/messaging/action-configs/interactable/FetchInteractableTree.ActionConfig';
import { FetchComponentBoundingBox_ActionConfig } from '~shared/messaging/action-configs/page-actions/FetchComponentBoundingBox.ActionConfig';
import { FetchFullPage_ActionConfig } from '~shared/messaging/action-configs/page-actions/FetchFullPage.ActionConfig';
import { InteractPage_ActionConfig } from '~shared/messaging/action-configs/page-actions/InteractPage.ActionConfig';
import { NavigatePage_ActionConfig } from '~shared/messaging/action-configs/page-actions/NavigatePage.ActionConfig';
import { ReadScreen_ActionConfig } from '~shared/messaging/action-configs/page-actions/ReadScreen.ActionConfig';
import { Screenshot_ActionConfig } from '~shared/messaging/action-configs/page-actions/Screenshot.ActionConfig';
import { WaitForPage_ActionConfig } from '~shared/messaging/action-configs/page-actions/WaitForPage.ActionConfig';
import { PortalMouseControl_ActionConfig } from '~shared/messaging/action-configs/portal-actions/PortalMouseControl.ActionConfig';
import { CompleteAnalysis_ActionConfig } from '~shared/messaging/action-configs/shadow-mode/CompleteAnalysis.ActionConfig';
import { FetchShadowEvents_ActionConfig } from '~shared/messaging/action-configs/shadow-mode/FetchShadowEvents.ActionConfig';
import { StartShadowMode_ActionConfig } from '~shared/messaging/action-configs/shadow-mode/StartShadowMode.ActionConfig';
import { StopShadowMode_ActionConfig } from '~shared/messaging/action-configs/shadow-mode/StopShadowMode.ActionConfig';
import { CheckCurrentTabIsActive_ActionConfig } from '~shared/messaging/action-configs/tab/CheckCurrentTabIsActive.ActionConfig';
import { GetActiveTab_ActionConfig } from '~shared/messaging/action-configs/tab/GetActiveTab.ActionConfig';
import { GetCurrentTab_ActionConfig } from '~shared/messaging/action-configs/tab/GetCurrentTab.ActionConfig';
import { GetTabById_ActionConfig } from '~shared/messaging/action-configs/tab/GetTabById.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export const ActionConfigRegistry = {
  [ServiceWorkerMessageAction.PING]: Ping_ActionConfig,
  [ServiceWorkerMessageAction.CLOSE]: Close_ActionConfig,
  [ServiceWorkerMessageAction.LOG_TO_CONSOLE]: LogToConsole_ActionConfig,
  [ServiceWorkerMessageAction.GO_LOGIN]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.GET_USER_SESSION]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.OPEN_POPUP]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.OPEN_SIDE_PANEL]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.GET_ALL_TARGET_INFO]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.CACHE_COOKIES]: CacheCookies_ActionConfig,
  [ServiceWorkerMessageAction.CURRENT_CURSOR_TYPE]: FetchCurrentCursorType_ActionConfig,

  // Tab
  [ServiceWorkerMessageAction.GET_CURRENT_TAB]: GetCurrentTab_ActionConfig,
  [ServiceWorkerMessageAction.GET_ACTIVE_TAB]: GetActiveTab_ActionConfig,
  [ServiceWorkerMessageAction.GET_TAB_BY_ID]: GetTabById_ActionConfig,
  [ServiceWorkerMessageAction.CHECK_CURRENT_TAB_IS_ACTIVE]: CheckCurrentTabIsActive_ActionConfig,

  // Browser Actions
  [ServiceWorkerMessageAction.CLOSE_TAB]: CloseTab_ActionConfig,
  [ServiceWorkerMessageAction.HIGHLIGHT_TABS]: HighlightTabs_ActionConfig,
  [ServiceWorkerMessageAction.OPEN_NEW_TAB]: OpenNewTab_ActionConfig,
  [ServiceWorkerMessageAction.OPEN_NEW_WINDOW]: OpenNewWindow_ActionConfig,
  [ServiceWorkerMessageAction.QUERY_TABS]: QueryTabs_ActionConfig,

  // Page Actions
  [ServiceWorkerMessageAction.FETCH_FULL_PAGE]: FetchFullPage_ActionConfig,
  [ServiceWorkerMessageAction.INTERACT_PAGE]: InteractPage_ActionConfig,
  [ServiceWorkerMessageAction.NAVIGATE_PAGE]: NavigatePage_ActionConfig,
  [ServiceWorkerMessageAction.READ_SCREEN]: ReadScreen_ActionConfig,
  [ServiceWorkerMessageAction.SCREENSHOT]: Screenshot_ActionConfig,
  [ServiceWorkerMessageAction.FETCH_COMPONENT_BOUNDING_BOX]: FetchComponentBoundingBox_ActionConfig,
  [ServiceWorkerMessageAction.WAIT_FOR_PAGE]: WaitForPage_ActionConfig,

  // Control Actions
  [ServiceWorkerMessageAction.KEYBOARD_TYPE]: KeyboardType_ActionConfig,
  [ServiceWorkerMessageAction.MOUSE_CLICK]: MouseClick_ActionConfig,
  [ServiceWorkerMessageAction.MOUSE_MOVE]: MouseMove_ActionConfig,
  [ServiceWorkerMessageAction.MOUSE_RESET]: MouseReset_ActionConfig,
  [ServiceWorkerMessageAction.MOUSE_WHEEL]: MouseWheel_ActionConfig,

  // Portal Actions
  [ServiceWorkerMessageAction.PORTAL_MOUSE_CONTROL]: PortalMouseControl_ActionConfig,

  // Recorder
  [ServiceWorkerMessageAction.FETCH_LIVE_RECORDING_EVENTS]: FetchLiveRecordingEvents_ActionConfig,
  [ServiceWorkerMessageAction.FETCH_BACKEND_NODE_ID_FOR_DOM_TREE]: FetchBackendNodeIdForDomTree_ActionConfig,
  [ServiceWorkerMessageAction.BUILD_INTERACTABLE_FOR_SNAPSHOT]: BuildInteractableForSnapshot_ActionConfig,

  // Shadow Mode
  [ServiceWorkerMessageAction.START_SHADOW_MODE]: StartShadowMode_ActionConfig,
  [ServiceWorkerMessageAction.STOP_SHADOW_MODE]: StopShadowMode_ActionConfig,
  [ServiceWorkerMessageAction.COMPLETE_ANALYSIS]: CompleteAnalysis_ActionConfig,
  [ServiceWorkerMessageAction.FETCH_SHADOW_EVENTS]: FetchShadowEvents_ActionConfig,

  // Interactable
  [ServiceWorkerMessageAction.ATTACH_INTERACTABLE]: AttachInteractable_ActionConfig,
  [ServiceWorkerMessageAction.REFRESH_INTERACTABLE]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_DICT]: FetchInteractableNodeDict_ActionConfig,
  [ServiceWorkerMessageAction.FETCH_INTERACTABLE_TREE]: FetchInteractableTree_ActionConfig,
  [ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_BY_SNAPSHOT_NANOID]:
    FetchInteractableNodeBySnapshotId_ActionConfig,

  // ChatGPT
  [ServiceWorkerMessageAction.GET_CHATGPT_TAB_ID]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.OPEN_CHATGPT_TAB]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.SEND_CHATGPT_MESSAGE]: Untyped_ActionConfig,

  // Sandbox Forwarder
  [ServiceWorkerMessageAction.STATIC_FUNCTION_EVAL]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.OBJECT_FUNCTION_EVAL]: Untyped_ActionConfig,

  // TS Interpreter
  [ServiceWorkerMessageAction.INTERPRET_LINE]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.INTERPRET_ONE_OFF_LINE]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.INTERPRETER_RELOAD]: Untyped_ActionConfig,

  // Broadcast Service
  [ServiceWorkerMessageAction.BROADCAST_SEND]: Untyped_ActionConfig,
  [ServiceWorkerMessageAction.BROADCAST_FETCH]: Untyped_ActionConfig,

  // Others
  [ServiceWorkerMessageAction.UNDEFINED]: Untyped_ActionConfig,
} as const;

export type ActionConfigType = (typeof ActionConfigRegistry)[ServiceWorkerMessageAction];

export const getActionConfig = (action: ServiceWorkerMessageAction): ActionConfigType => {
  const config = ActionConfigRegistry[action];
  if (!config) throw new Error(`No action config found for action: ${action}`);
  return config;
};
