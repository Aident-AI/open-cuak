import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import {
  BrowserAction,
  BrowserActionApi,
  isBrowserAction,
} from '~src/app/api/extension/browser/[action]/BrowserActionApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (action?: string) => {
    if (!action) throw new Error('Missing action value');
    if (!isBrowserAction(action)) throw new Error('Invalid action value: ' + action);
    return new BrowserActionApi(action as BrowserAction);
  },
  { assertUserLoggedIn: true },
);
