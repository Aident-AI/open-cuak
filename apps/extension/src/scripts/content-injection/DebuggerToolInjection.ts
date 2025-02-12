import { AppSetting } from '~shared/app-settings/types';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { isDevelopment } from '~shared/env/environment';
import { SNAPSHOT_NANOID_ATTRIBUTE_KEY } from '~shared/interactable/types';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { AppSettingsService } from '~src/common/services/AppSettingsService';

type EventListener = {
  event: keyof DocumentEventMap;
  listener: (event: Event) => void;
};

const INDICATOR_TOOLTIP_ID = 'debugger-indicator-tooltip';

export class DebuggerToolInjection {
  public static async init() {
    if (!isDevelopment()) return;

    this.#instance = new DebuggerToolInjection();
    const handleAppSetting = (isOn: boolean) => {
      // eslint-disable-next-line no-console
      console.info('INTERACTABLE_NODE_INDICATOR', isOn ? 'enabled' : 'disabled');
      isOn ? this.start() : this.stop();
    };
    AppSettingsService.subscribe<boolean>(AppSetting.INTERACTABLE_NODE_INDICATOR, handleAppSetting);
    const isOn = await AppSettingsService.fetch<boolean>(AppSetting.INTERACTABLE_NODE_INDICATOR);
    handleAppSetting(isOn);
  }

  public static start() {
    this.instance.#eventListeners.forEach(({ event, listener }) => document.addEventListener(event, listener));
  }

  public static stop() {
    this.instance.#eventListeners.forEach(({ event, listener }) => document.removeEventListener(event, listener));
  }

  public static get instance() {
    if (!this.#instance) throw new Error('DebuggerToolInjection instance not initialized');
    return this.#instance;
  }

  public static getHoveredElementNanoids() {
    return Array.from(this.instance.#hoveredElementNanoids);
  }

  static #instance: DebuggerToolInjection | null = null;

  private constructor() {}

  #eventListeners: Array<EventListener> = [
    {
      event: 'mouseover',
      listener: async (event: Event) => {
        const element = (event as MouseEvent).target as HTMLElement;
        if (element.id === INDICATOR_TOOLTIP_ID) return;
        element.style.outline = '1px solid blue';

        const elementNanoid = this.#getElementSnapshotNanoid(element);
        this.#hoveredElementNanoids.add(elementNanoid);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const target = (await this.#fetchTargetElement(elementNanoid)) as any;
        target.style.outline = '2px solid red';

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.id = INDICATOR_TOOLTIP_ID;
        tooltip.className = 'snapshot-tooltip';
        tooltip.innerText = target.getAttribute('snapshot-nanoid') || '';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'yellow';
        tooltip.style.fontSize = '12px';
        tooltip.style.fontFamily = 'Arial, sans-serif';
        tooltip.style.color = 'black';
        tooltip.style.border = '1px solid black';
        tooltip.style.padding = '2px';
        tooltip.style.zIndex = '1000';

        target.appendChild(tooltip);
        target.__snapshotTooltip = tooltip;
      },
    },
    {
      event: 'mouseout',
      listener: async (event: Event) => {
        const element = (event as MouseEvent).target as HTMLElement;
        if (element.id === INDICATOR_TOOLTIP_ID) return;
        element.style.outline = 'none';

        const elementNanoid = this.#getElementSnapshotNanoid(element);
        this.#hoveredElementNanoids.delete(elementNanoid);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const target = (await this.#fetchTargetElement(elementNanoid)) as any;
        target.style.outline = 'none';

        // Remove tooltip if it exists
        const tooltip = target.__snapshotTooltip;
        if (!tooltip) return;
        target.removeChild(tooltip);
        delete target.__snapshotTooltip;
      },
    },
  ];

  #getElementSnapshotNanoid = (element: HTMLElement): string => {
    const snapshotNanoid = element.getAttribute(SNAPSHOT_NANOID_ATTRIBUTE_KEY);
    if (!snapshotNanoid || snapshotNanoid.length < 1)
      throw new Error('Snapshot nanoid not found on element attribute.');
    return snapshotNanoid;
  };

  #fetchTargetElement = async (snapshotNanoid: string): Promise<HTMLElement> => {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_BY_SNAPSHOT_NANOID,
      payload: { snapshotNanoid: snapshotNanoid },
    });
    if (!rsp?.success) throw new Error('Failed to fetch interactable node: ' + (rsp?.error ?? 'unknown error'));
    const targetNodeId = rsp.data.iNodeId;

    const target = document.querySelector(`[${SNAPSHOT_NANOID_ATTRIBUTE_KEY}="${targetNodeId}"]`);
    if (!target) throw new Error(`Element with snapshot node ID ${snapshotNanoid} not found`);
    return target as HTMLElement;
  };

  #hoveredElementNanoids = new Set<string>();
}
