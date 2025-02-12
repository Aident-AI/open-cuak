import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { NavigatePageApi } from '~src/app/api/extension/page/navigate/NavigatePageApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new NavigatePageApi(), { assertUserLoggedIn: true });
