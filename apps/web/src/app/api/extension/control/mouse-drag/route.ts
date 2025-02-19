import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { MouseDragApi } from '~src/app/api/extension/control/mouse-drag/MouseDragApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new MouseDragApi(), { assertUserLoggedIn: true });
