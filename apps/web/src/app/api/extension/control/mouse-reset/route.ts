import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { MouseResetApi } from '~src/app/api/extension/control/mouse-reset/MouseResetApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new MouseResetApi(), { assertUserLoggedIn: true });
