import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { PingApi } from '~src/app/api/extension/ping/PingApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 5;

export const POST = BaseExtensionApiRouteWrapper(() => new PingApi(), { assertUserLoggedIn: true });
