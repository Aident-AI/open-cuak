import { getHost, isDevelopment } from '~shared/env/environment';
import { ContentBroadcastForwarder } from '~src/scripts/content-injection/message/ContentBroadcastForwarder';

const EXTENSION_SHADOW_ROOT_ID = 'aident-companion-shadow-root';
const EXTENSION_IFRAME_ID = 'aident-companion-iframe';
const EXTENSION_IFRAME_STYLE_ID = 'aident-companion-iframe-style';
const EXTENSION_IFRAME_SCRIPT_ID = 'aident-companion-iframe-script';
const EXTENSION_REFRESH_BUTTON_ID = 'aident-companion-refresh-button';

export class ExtensionIframeInjection {
  public static async init() {
    // // turn off for now
    // const injection = new ExtensionIframeInjection();
    // this.inject();
  }

  public inject(): void {
    const div = document.createElement('div');
    div.id = EXTENSION_SHADOW_ROOT_ID;
    div.attachShadow({ mode: 'open' });
    document.body.appendChild(div);

    this._appendIFrame();
    this._appendRefreshButton();

    const iframe = this.getOnlyIframe();
    const broadcastForwarder = new ContentBroadcastForwarder(iframe);
    broadcastForwarder.start();
  }

  public remove(): void {
    const shadowRoot = this.getShadowRoot();
    document.body.removeChild(shadowRoot);
  }

  public getShadowRoot() {
    return document.getElementById(EXTENSION_SHADOW_ROOT_ID)?.shadowRoot as ShadowRoot;
  }

  public getOnlyIframe() {
    return this.getShadowRoot()?.getElementById(EXTENSION_IFRAME_ID) as HTMLIFrameElement;
  }

  public getExtensionIframe() {
    const iframe = this.getShadowRoot()?.getElementById(EXTENSION_IFRAME_ID) as HTMLIFrameElement;
    iFrameResize({ log: false, checkOrigin: false }, iframe);
    const style = this.getShadowRoot()?.getElementById(EXTENSION_IFRAME_STYLE_ID) as HTMLStyleElement;
    const script = this.getShadowRoot()?.getElementById(EXTENSION_IFRAME_SCRIPT_ID) as HTMLScriptElement;

    return { iframe, style, script };
  }

  public getRefreshButton() {
    return this.getShadowRoot()?.getElementById(EXTENSION_REFRESH_BUTTON_ID) as HTMLButtonElement;
  }

  private _appendIFrame() {
    const iframe = document.createElement('iframe');
    iframe.src = getHost() + '/extension/fab';
    iframe.id = EXTENSION_IFRAME_ID;
    iframe.name = EXTENSION_IFRAME_ID;
    this.getShadowRoot().appendChild(iframe);

    const style = document.createElement('style');
    style.id = EXTENSION_IFRAME_STYLE_ID;
    style.textContent = `
      iframe {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 99999999;
        width: 0;
        height: 0;
        background-color: transparent !important;
        overflow: visible !important;
        border: none;
        border-radius: 12px;
      }

      /* Styles for dark mode */
      @media (prefers-color-scheme: dark) {
        iframe {
          color-scheme: light;
        }
      }
    `;
    this.getShadowRoot().appendChild(style);

    const script = document.createElement('script');
    script.id = EXTENSION_IFRAME_SCRIPT_ID;
    script.setAttribute('type', 'text/javascript');
    const jsPath = chrome.runtime.getURL('/js/iframeResizer.min.js');
    script.setAttribute('src', jsPath);
    script.onload = () =>
      iFrameResize(
        {
          checkOrigin: false,
          autoResize: true,
          sizeHeight: true,
          sizeWidth: true,
          widthCalculationMethod: 'taggedElement',
          heightCalculationMethod: 'taggedElement',
        },
        iframe,
      );
    this.getShadowRoot().appendChild(script);
  }

  private _appendRefreshButton() {
    if (!isDevelopment()) return;
    const button = document.createElement(EXTENSION_REFRESH_BUTTON_ID);
    button.textContent = 'Refresh';
    button.addEventListener('click', () => {
      const { iframe, style, script } = this.getExtensionIframe();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (iframe) (iframe as any).iFrameResizer.close();
      if (style) this.getShadowRoot().removeChild(style);
      if (script) this.getShadowRoot().removeChild(script);

      this._appendIFrame();
    });
    button.className = 'refresh-button';
    button.style.zIndex = '99999999';
    button.style.position = 'fixed';
    button.style.bottom = '0rem';
    button.style.right = '1rem';
    button.style.paddingLeft = '6px';
    button.style.paddingRight = '6px';
    button.style.backgroundColor = 'black';
    button.style.color = 'white';
    button.style.borderRadius = '4px';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    this.getShadowRoot().appendChild(button);
  }
}
