/* eslint-disable @typescript-eslint/ban-types */
import { oneLine } from 'common-tags';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { BaseEndpointApi } from '~src/app/api/BaseEndpointApi';
import { BaseEndpointApiSpec } from '~src/app/api/BaseEndpointApiSpec';
import { BrowserActionApi } from '~src/app/api/extension/browser/[action]/BrowserActionApi';
import { MouseClickApi } from '~src/app/api/extension/control/mouse-click/MouseClickApi';
import { MouseResetApi } from '~src/app/api/extension/control/mouse-reset/MouseResetApi';
import { MouseWheelApi } from '~src/app/api/extension/control/mouse-wheel/MouseWheelApi';
import { PingApi } from '~src/app/api/extension/ping/PingApi';
import { PortalMouseControlApi } from '~src/app/api/portal/mouse-control/PortalMouseControlApi';

const MouseControlApis = [
  MouseClickApi,
  // MouseMoveApi,
  PortalMouseControlApi,
  MouseResetApi,
  MouseWheelApi,
];

const AllowedBrowserActions = [
  ServiceWorkerMessageAction.CLOSE_TAB,
  ServiceWorkerMessageAction.HIGHLIGHT_TABS,
  ServiceWorkerMessageAction.OPEN_NEW_TAB,
  ServiceWorkerMessageAction.QUERY_TABS,
] as const;
const BrowserApis = AllowedBrowserActions.map((action) => new BrowserActionApi(action));

export class VisionBasedBrowserControlApiSpec extends BaseEndpointApiSpec {
  public readonly apis = [...MouseControlApis, PingApi]
    .map((i) => new i() as BaseEndpointApi)
    .concat([...BrowserApis])
    .sort((a, b) => a.EndpointConfig.operationId.localeCompare(b.EndpointConfig.operationId));

  public readonly title = 'Aident Browser Control APIs';
  public readonly version = '0.0.1';
  public readonly description = oneLine`
    A set of tools for Aiden to interact with a remote browser session. Aiden can use the mouse and keyboard to interact
    with the browser, in order to navigate and interact with web pages. With this ability, Aiden can perform tasks that
    require browser interaction, such as logging into websites, interacting with web tools, and more.
  `;
}
