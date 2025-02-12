import { BroadcastService } from '~src/common/services/BroadcastService';

export class ContentBroadcastForwarder {
  constructor(private targetIframe: HTMLIFrameElement) {}

  public start() {
    this.#active = true;

    const iframe = this.targetIframe;
    BroadcastService.subscribeAll((event, value, oldValue) => {
      if (!this.#active) return;
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage({ type: 'aident-broadcast-forward', message: { event, value, oldValue } }, '*'); // TODO: change to a more narrowed target origin
    });
  }

  public stop() {
    this.#active = false;
  }

  #active = false;
}
