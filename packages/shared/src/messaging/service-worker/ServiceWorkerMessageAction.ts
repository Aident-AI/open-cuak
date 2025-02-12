export enum ServiceWorkerMessageAction {
  PING = 'ping',
  CLOSE = 'close',
  LOG_TO_CONSOLE = 'log-to-console',
  GO_LOGIN = 'go-login',
  GET_USER_SESSION = 'get-user-session',
  OPEN_POPUP = 'open-popup',
  OPEN_SIDE_PANEL = 'open-side-panel',
  GET_ALL_TARGET_INFO = 'get-all-target-info',
  CACHE_COOKIES = 'cache-cookies',
  CURRENT_CURSOR_TYPE = 'current-cursor-type',

  // Tab
  GET_CURRENT_TAB = 'get-current-tab',
  GET_ACTIVE_TAB = 'get-active-tab',
  GET_TAB_BY_ID = 'get-tab-by-id',
  CHECK_CURRENT_TAB_IS_ACTIVE = 'tab:check-current-tab-is-active',

  // Browser Actions
  CLOSE_TAB = 'close-tab',
  HIGHLIGHT_TABS = 'highlight-tabs',
  OPEN_NEW_TAB = 'open-new-tab',
  OPEN_NEW_WINDOW = 'open-new-window',
  QUERY_TABS = 'query-tabs',

  // Page Actions
  FETCH_FULL_PAGE = 'page:fetch',
  INTERACT_PAGE = 'page:interact',
  NAVIGATE_PAGE = 'page:navigate',
  READ_SCREEN = 'page:read-screen',
  SCREENSHOT = 'page:screenshot',
  FETCH_COMPONENT_BOUNDING_BOX = 'page:fetch-component-bounding-box',
  WAIT_FOR_PAGE = 'page:wait-for',

  // Control Actions
  KEYBOARD_TYPE = 'keyboard:type',
  MOUSE_CLICK = 'mouse:click',
  MOUSE_MOVE = 'mouse:move',
  MOUSE_RESET = 'mouse:reset',
  MOUSE_WHEEL = 'mouse:wheel',

  // Portal Actions
  PORTAL_MOUSE_CONTROL = 'portal:mouse-control',

  // Recorder
  FETCH_LIVE_RECORDING_EVENTS = 'fetch-live-recording-events',
  FETCH_BACKEND_NODE_ID_FOR_DOM_TREE = 'fetch-backend-node-id-for-dom-tree',
  BUILD_INTERACTABLE_FOR_SNAPSHOT = 'build-interactable-for-snapshot',

  // Shadow Mode
  START_SHADOW_MODE = 'shadow-mode:start',
  STOP_SHADOW_MODE = 'shadow-mode:stop',
  COMPLETE_ANALYSIS = 'shadow-mode:complete-analysis',
  FETCH_SHADOW_EVENTS = 'shadow-mode:fetch-events',

  // Interactable
  ATTACH_INTERACTABLE = 'attach-interactable',
  REFRESH_INTERACTABLE = 'refresh-interactable',
  FETCH_INTERACTABLE_NODE_DICT = 'fetch-interactable-node-dict',
  FETCH_INTERACTABLE_TREE = 'fetch-interactable-tree',
  FETCH_INTERACTABLE_NODE_BY_SNAPSHOT_NANOID = 'fetch-interactable-node-by-snapshot-nanoid',

  // ChatGPT
  GET_CHATGPT_TAB_ID = 'get-chatgpt-tab-id',
  OPEN_CHATGPT_TAB = 'open-chatgpt-tab',
  SEND_CHATGPT_MESSAGE = 'send-chatgpt-message',

  // Sandbox Forwarder
  STATIC_FUNCTION_EVAL = 'static-function-eval',
  OBJECT_FUNCTION_EVAL = 'object-function-eval',

  // TS Interpreter
  INTERPRET_LINE = 'interpret-line',
  INTERPRET_ONE_OFF_LINE = 'interpret-one-off-line',
  INTERPRETER_RELOAD = 'interpreter-reload',

  // Broadcast Service
  BROADCAST_SEND = 'broadcast-send',
  BROADCAST_FETCH = 'broadcast-fetch',

  // Others
  UNDEFINED = 'undefined',
}
