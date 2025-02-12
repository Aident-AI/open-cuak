import { Session } from '@supabase/supabase-js';
import { BroadcastEventType } from '~shared/broadcast/types';
import { getHost, isStringConfigOn } from '~shared/env/environment';
import {
  ExtensionPopupMenuInboundEvent,
  ExtensionPopupMenuOutboundEvent,
  ExtensionPopupMenuOutboundMessageSchema,
  ExtensionPopupMenuWindowMessageOrigin,
} from '~shared/extension/ExtensionPopupMenuWindowMessage';
import { SupabaseUserSession } from '~shared/supabase/SupabaseAuthTokens';
import { BroadcastService } from '~src/common/services/BroadcastService';

type EventListener = {
  event: keyof DocumentEventMap;
  listener: (event: Event) => void;
};

const EXTENSION_POPUP_MENU_CONTAINER_ID = 'aident-extension-popup-menu-container';
const EXTENSION_POPUP_MENU_IFRAME_ID = 'aident-extension-popup-menu-iframe';

// TODO: remove this injection
/**
 * @deprecated This class is deprecated and will be removed in future versions.
 */
export class PopupMenuInjection {
  public static async init() {
    this.#instance = new PopupMenuInjection();
    this.start();
  }

  public static start() {
    this.instance.#eventListeners.forEach(({ event, listener }) => document.addEventListener(event, listener));
  }

  public static stop() {
    this.instance.#eventListeners.forEach(({ event, listener }) => document.removeEventListener(event, listener));
  }

  public static get instance() {
    if (!this.#instance) throw new Error('PopupMenuInjection instance not initialized');
    return this.#instance;
  }

  static #instance: PopupMenuInjection | null = null;

  private constructor() {
    const handleSession = (newValue: unknown) => {
      this.#userSession = (newValue as SupabaseUserSession)?.session;
      if (!this.#componentReady) return;
      this.#sendInboundMessage(ExtensionPopupMenuInboundEvent.UPDATE_SESSION, { session: this.#userSession });
    };
    BroadcastService.subscribeType(BroadcastEventType.USER_SESSION_UPDATED, (_, newValue) => handleSession(newValue));
    BroadcastService.fetch({ type: BroadcastEventType.USER_SESSION_UPDATED }).then((session) => handleSession(session));
  }

  #eventListeners: Array<EventListener> = [
    {
      event: 'mouseup',
      listener: async (event: Event) => {
        const target = event.target as HTMLElement;
        if (target.closest('.selection-popup')) return;

        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        const focusedElement = document.activeElement as HTMLElement;
        const isFocusedInput =
          focusedElement &&
          (focusedElement.tagName === 'INPUT' ||
            focusedElement.tagName === 'TEXTAREA' ||
            isStringConfigOn(focusedElement.getAttribute('contenteditable')));

        if ((!selectedText || selectedText.length === 0) && !isFocusedInput) {
          this.#removeExistingPopup();
          return;
        }

        let rect: DOMRect;
        if (selectedText) {
          rect = selection?.getRangeAt(0).getBoundingClientRect() as DOMRect;
        } else {
          rect = focusedElement.getBoundingClientRect();
        }

        const x = rect.left + window.scrollX;
        const y = rect.bottom + window.scrollY;

        this.#showPopup(
          x,
          y,
          selectedText ||
            (focusedElement as HTMLInputElement | HTMLTextAreaElement).value ||
            focusedElement.textContent ||
            '',
        );
      },
    },
    {
      event: 'focus',
      listener: (event: Event) => {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          isStringConfigOn(target.getAttribute('contenteditable'))
        ) {
          const rect = target.getBoundingClientRect();
          const x = rect.left + window.scrollX;
          const y = rect.bottom + window.scrollY;
          this.#showPopup(x, y, (target as HTMLInputElement | HTMLTextAreaElement).value || target.textContent || '');
        }
      },
    },
  ];

  #popupContainer?: HTMLDivElement;
  #messageListener?: (e: MessageEvent) => void;
  #userSession?: Session;
  #componentReady = false;

  #removeExistingPopup() {
    if (this.#popupContainer) {
      this.#popupContainer.style.visibility = 'hidden';
      this.#popupContainer.style.overflow = 'hidden';
      this.#popupContainer.style.left = '0';
      this.#popupContainer.style.top = '100%';
      this.#popupContainer.style.width = '0';
      this.#popupContainer.style.height = '0';
    }

    if (this.#messageListener) {
      window.removeEventListener('message', this.#messageListener);
      this.#messageListener = undefined;
    }
  }

  #showPopup = (x: number, y: number, text: string): void => {
    this.#removeExistingPopup();

    // check if iframe already exists
    if (this.#popupContainer) {
      const popupContainer = this.#popupContainer;
      popupContainer.style.visibility = 'visible';
      popupContainer.style.overflow = 'visible';
      popupContainer.style.left = `${x}px`;
      popupContainer.style.top = `${y + 8}px`;
      this.#sendInboundMessage(ExtensionPopupMenuInboundEvent.RESET_STATES);
    } else {
      // create new popup container
      const popupContainer = document.createElement('div');
      popupContainer.id = EXTENSION_POPUP_MENU_CONTAINER_ID;
      popupContainer.attachShadow({ mode: 'open' });
      popupContainer.style.position = 'absolute';
      popupContainer.style.left = `${x}px`;
      popupContainer.style.top = `${y + 8}px`;
      popupContainer.style.zIndex = '9999999';
      document.body.appendChild(popupContainer);

      // create new iframe
      const iframe = document.createElement('iframe');
      iframe.id = EXTENSION_POPUP_MENU_IFRAME_ID;
      iframe.src = `${getHost()}/extension/popup-menu`;
      iframe.style.backgroundColor = 'transparent';
      iframe.style.border = 'none';
      iframe.style.height = '0';
      iframe.style.overflow = 'hidden';
      iframe.style.width = '0';

      const shadowRoot = popupContainer.shadowRoot;
      if (!shadowRoot) throw new Error('Shadow root not found');
      shadowRoot.appendChild(iframe);

      this.#popupContainer = popupContainer;
    }

    this.#messageListener = async (e: MessageEvent) => {
      if (e.data.origin !== ExtensionPopupMenuWindowMessageOrigin || e.data.direction !== 'outbound') return;

      const message = ExtensionPopupMenuOutboundMessageSchema.parse(e.data);
      switch (message.type) {
        case ExtensionPopupMenuOutboundEvent.ADJUST_STYLE: {
          const { width, height, borderRadius } = message.content;
          const iframe = this.#getIframe();
          if (iframe) {
            iframe.style.width = width + 'px';
            iframe.style.height = height + 'px';
            if (borderRadius) iframe.style.borderRadius = borderRadius;
          }
          break;
        }
        case ExtensionPopupMenuOutboundEvent.CLOSE_POPUP: {
          this.#removeExistingPopup();
          break;
        }
        case ExtensionPopupMenuOutboundEvent.COMPONENT_READY: {
          this.#sendInboundMessage(ExtensionPopupMenuInboundEvent.SELECTED_TEXT, { text });
          if (this.#componentReady) return;

          this.#componentReady = true;
          this.#sendInboundMessage(ExtensionPopupMenuInboundEvent.UPDATE_SESSION, { session: this.#userSession });
          break;
        }
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    };
    window.addEventListener('message', this.#messageListener);
  };

  #getIframe(): HTMLIFrameElement | undefined {
    const iframe = this.#popupContainer?.shadowRoot?.getElementById(EXTENSION_POPUP_MENU_IFRAME_ID);
    return iframe ? (iframe as HTMLIFrameElement) : undefined;
  }

  #sendInboundMessage(type: string, content?: object) {
    const iframe = this.#getIframe();
    if (!iframe) throw new Error('Iframe in popup-menu component not found');
    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) throw new Error('Window in iframe component not found');

    const message = { origin: ExtensionPopupMenuWindowMessageOrigin, direction: 'inbound', type, content };
    iframeWindow.postMessage(message, '*');
  }
}
