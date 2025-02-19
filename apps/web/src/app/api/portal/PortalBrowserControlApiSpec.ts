/* eslint-disable @typescript-eslint/ban-types */
import { oneLine } from 'common-tags';
import { BaseEndpointApi } from '~src/app/api/BaseEndpointApi';
import { BaseEndpointApiSpec } from '~src/app/api/BaseEndpointApiSpec';
import { KeyboardTypeApi } from '~src/app/api/extension/control/keyboard-type/KeyboardTypeApi';
import { MouseClickApi } from '~src/app/api/extension/control/mouse-click/MouseClickApi';
import { MouseDragApi } from '~src/app/api/extension/control/mouse-drag/MouseDragApi';
import { MouseMoveApi } from '~src/app/api/extension/control/mouse-move/MouseMoveApi';
import { MouseResetApi } from '~src/app/api/extension/control/mouse-reset/MouseResetApi';
import { MouseWheelApi } from '~src/app/api/extension/control/mouse-wheel/MouseWheelApi';
import { NavigatePageApi } from '~src/app/api/extension/page/navigate/NavigatePageApi';
import { PortalMouseControlApi } from '~src/app/api/portal/mouse-control/PortalMouseControlApi';
import { PortalWaitToolApi } from '~src/app/api/portal/wait-tool/PortalWaitToolApi';

const MouseControlApis = [
  KeyboardTypeApi,
  MouseClickApi,
  MouseDragApi,
  MouseMoveApi,
  MouseResetApi,
  MouseWheelApi,
  NavigatePageApi,
  PortalMouseControlApi,
  PortalWaitToolApi,
];

export class PortalBrowserControlApiSpec extends BaseEndpointApiSpec {
  public readonly apis = [...MouseControlApis]
    .map((i) => new i() as BaseEndpointApi)
    .sort((a, b) => a.EndpointConfig.operationId.localeCompare(b.EndpointConfig.operationId));

  public readonly title = 'Remote Browser Portal Control APIs';
  public readonly version = '0.0.2';
  public readonly description = oneLine`
    A set of tools for Aiden to interact with a remote browser session. Aiden can use the mouse and keyboard to interact
    with the browser session, in order to navigate and interact with web pages. With this ability, Aiden can perform basic
    actions requiring mouse and keyboard input, and then high level tasks like logging into websites, using web tools,
    and many more.
  `;
}
