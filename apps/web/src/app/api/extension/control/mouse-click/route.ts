import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { MouseClickApi } from '~src/app/api/extension/control/mouse-click/MouseClickApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new MouseClickApi(), { assertUserLoggedIn: true });
