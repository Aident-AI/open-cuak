import { BaseEndpointApiSpec } from '~src/app/api/BaseEndpointApiSpec';
import { AllowedBrowserActionApis } from '~src/app/api/extension/browser/[action]/BrowserActionApi';

export class BrowserActionApiSpec extends BaseEndpointApiSpec {
  public readonly apis = AllowedBrowserActionApis;
  public readonly title = 'Aident Extension - Browser APIs';
  public readonly version = '0.0.1';
  public readonly description =
    'A tool set to control the browser for tab management through Aident Companion Extension.';
}
