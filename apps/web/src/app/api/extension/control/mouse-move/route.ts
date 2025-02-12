import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { MouseMoveApi } from '~src/app/api/extension/control/mouse-move/MouseMoveApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new MouseMoveApi(), { assertUserLoggedIn: true });
