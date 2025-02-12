import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { PortalMouseControlApi } from '~src/app/api/portal/mouse-control/PortalMouseControlApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new PortalMouseControlApi(), { assertUserLoggedIn: true });
