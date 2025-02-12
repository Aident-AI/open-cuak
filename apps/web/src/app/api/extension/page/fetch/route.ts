import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { ReadFullPageApi } from '~src/app/api/extension/page/fetch/ReadFullPageApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new ReadFullPageApi(), { assertUserLoggedIn: true });
