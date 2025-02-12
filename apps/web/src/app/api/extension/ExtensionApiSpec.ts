/* eslint-disable @typescript-eslint/ban-types */
import { oneLine } from 'common-tags';
import { BaseEndpointApi } from '~src/app/api/BaseEndpointApi';
import { BaseEndpointApiSpec } from '~src/app/api/BaseEndpointApiSpec';
import { AllowedBrowserActionApis } from '~src/app/api/extension/browser/[action]/BrowserActionApi';
import { MouseClickApi } from '~src/app/api/extension/control/mouse-click/MouseClickApi';
import { MouseMoveApi } from '~src/app/api/extension/control/mouse-move/MouseMoveApi';
import { MouseWheelApi } from '~src/app/api/extension/control/mouse-wheel/MouseWheelApi';
import { ReadFullPageApi } from '~src/app/api/extension/page/fetch/ReadFullPageApi';
import { AllowedInteractPageApis } from '~src/app/api/extension/page/interact/[interaction]/registry';
import { NavigatePageApi } from '~src/app/api/extension/page/navigate/NavigatePageApi';
import { PingApi } from '~src/app/api/extension/ping/PingApi';
import { PortalMouseControlApi } from '~src/app/api/portal/mouse-control/PortalMouseControlApi';

const ControlApis = [MouseClickApi, MouseMoveApi, MouseWheelApi];
const PortalControl = [PortalMouseControlApi];

const AllPageInteractionApis = [
  ReadFullPageApi,
  NavigatePageApi,
  ...ControlApis,
  ...PortalControl,
  // ReadScreenApi, // we now inject screen interaction tree by default
  // ScreenshotApi
];

export class ExtensionApiSpec extends BaseEndpointApiSpec {
  public readonly apis = [
    ...AllPageInteractionApis,
    // InteractableNodeFetchApi,
    // InteractableNodeHandleApi,
    // InteractablePageHandleApi,
    // InterpreterExecuteApi,
    PingApi,
  ]
    .map((i) => new i() as BaseEndpointApi)
    .concat([...AllowedInteractPageApis, ...AllowedBrowserActionApis])
    .sort((a, b) => a.EndpointConfig.operationId.localeCompare(b.EndpointConfig.operationId));

  public readonly title = 'Aident Extension APIs';
  public readonly version = '0.0.1';
  public readonly description = oneLine`
    A set of endpoints for GPT to interact with user's active browser tab through Aident Companion Extension. GPT can
    read content from the tab and control/interact with this tab through sending Puppeteer commands to the extension,
    which are run in the sandbox environment within user's browser.
  `;
}
