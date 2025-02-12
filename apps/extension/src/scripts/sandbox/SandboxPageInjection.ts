import { SANDBOX_PAGE_INJECTION_TARGET_ID } from '~shared/injection/const';
import { SandboxMessagingService } from '~src/scripts/sandbox/services/SandboxMessagingService';

export class SandboxPageInjection {
  public static targetId = SANDBOX_PAGE_INJECTION_TARGET_ID;

  public static async init() {
    if (this.target) this.remove();
    if (!this.#instance) this.#instance = new SandboxPageInjection();
    this.instance.#inject();
  }

  public static get instance() {
    if (!this.#instance) throw new Error('SandboxContentInjection instance not initialized');
    return this.#instance;
  }

  public static get target() {
    return document.getElementById(this.targetId) as HTMLIFrameElement;
  }

  public static remove(): void {
    document.body.removeChild(this.target);
  }

  static #instance: SandboxPageInjection | null = null;

  private constructor() {}

  #pendingInboundMessages: Map<string, unknown> = new Map();

  #inject(): void {
    this.#appendIframe();
    this.#addSandboxWindowEventListener();
    SandboxMessagingService.initForwarderInContentScript(this.#pendingInboundMessages);
  }

  #appendIframe() {
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('/app/sandbox.html');
    iframe.id = SandboxPageInjection.targetId;
    iframe.name = SandboxPageInjection.targetId;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  #addSandboxWindowEventListener() {
    // Listen for messages from the sandbox
    window.addEventListener('message', (event) => {
      if (event.source == window && event.data && event.data.type == 'FROM_SANDBOX') {
        // Handle the message from the sandbox
        chrome.runtime.sendMessage(event.data);
      }
    });
  }
}
