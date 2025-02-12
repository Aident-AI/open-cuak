import { ActionConfigType, getActionConfig } from '~shared/messaging/action-configs/registry';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export const AllBrowserActions = [
  ServiceWorkerMessageAction.CLOSE_TAB,
  ServiceWorkerMessageAction.HIGHLIGHT_TABS,
  ServiceWorkerMessageAction.OPEN_NEW_TAB,
  ServiceWorkerMessageAction.OPEN_NEW_WINDOW,
  ServiceWorkerMessageAction.QUERY_TABS,
] as const;
export type BrowserAction = (typeof AllBrowserActions)[number];
export const isBrowserAction = (action: string) => new Set<string>(AllBrowserActions).has(action);

export class BrowserActionApi extends ActionConfigBasedApi {
  constructor(public readonly browserAction: BrowserAction) {
    super();
  }

  public readonly endpointPath = '/api/extension/browser/' + this.actionConfig?.action;
  public override readonly tagPrefix = 'browser:';

  public override get actionConfig(): ActionConfigType {
    const config = getActionConfig(this.browserAction);
    if (!config) throw 'Invalid browser action value: ' + this.browserAction;
    return config;
  }
}

export const AllowedBrowserActionApis = AllBrowserActions.map((key) => new BrowserActionApi(key));
