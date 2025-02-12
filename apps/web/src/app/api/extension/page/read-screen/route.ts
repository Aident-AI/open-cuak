import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { ReadScreenApi } from '~src/app/api/extension/page/read-screen/ReadScreenApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new ReadScreenApi(), { assertUserLoggedIn: true });
