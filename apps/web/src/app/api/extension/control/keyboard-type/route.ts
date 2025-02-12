import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { MouseWheelApi } from '~src/app/api/extension/control/mouse-wheel/MouseWheelApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new MouseWheelApi(), { assertUserLoggedIn: true });
