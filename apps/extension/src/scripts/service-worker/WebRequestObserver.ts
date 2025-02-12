import { ChatgptTabService } from '~src/common/services/tab/ChatgptTabService';

enum WebRequestEvent {
  ON_BEFORE_REQUEST = 'onBeforeRequest',
  ON_COMPLETED = 'onCompleted',
  ON_ERROR_OCCURRED = 'onErrorOccurred',
}
const OnCompleteRequestEvents = new Set([WebRequestEvent.ON_COMPLETED, WebRequestEvent.ON_ERROR_OCCURRED]);

export class WebRequestObserver {
  public start() {
    ChatgptTabService.subscribe(async (chatgptTabId) => {
      if (chatgptTabId === this.#chatgptTabId) return;

      this.#chatgptTabId = chatgptTabId;
      this._restartObservers();
    });

    this._startObservers();
    // eslint-disable-next-line no-console
    console.debug('[WebRequestObserver] WebRequestObserver started!');
  }

  public get hasActiveNetworkRequest() {
    return this.#requestRegistry.size > 0;
  }

  #chatgptTabId: number | null = null;
  #observerFilter = { urls: ['<all_urls>'] };
  #handlerMap = new Map<WebRequestEvent, (details: chrome.webRequest.WebRequestDetails) => void>();
  #requestRegistry = new Set<string>();

  private _startObservers() {
    Object.values(WebRequestEvent).forEach((event) => {
      const handler = (details: chrome.webRequest.WebRequestDetails) => {
        if (details.tabId !== this.#chatgptTabId) return;
        const action = OnCompleteRequestEvents.has(event) ? 'delete' : 'add';
        this.#requestRegistry[action](details.requestId);
        // eslint-disable-next-line no-console
        console.debug(`[WebRequestObserver] network-active=${this.hasActiveNetworkRequest}`);
      };

      chrome.webRequest[event].addListener(handler, this.#observerFilter, []);
      this.#handlerMap.set(event, handler);
    });
  }

  private _restartObservers() {
    Object.values(WebRequestEvent).forEach((event) => {
      const handler = this.#handlerMap.get(event);
      if (!handler) return;
      chrome.webRequest[event].removeListener(handler);
    });
    this._startObservers();
  }
}
