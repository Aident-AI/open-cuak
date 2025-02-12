import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { ScreenshotApi } from '~src/app/api/extension/page/screenshot/ScreenshotApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(() => new ScreenshotApi(), { assertUserLoggedIn: true });
