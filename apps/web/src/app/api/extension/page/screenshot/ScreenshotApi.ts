import { Screenshot_ActionConfig } from '~shared/messaging/action-configs/page-actions/Screenshot.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class ScreenshotApi extends ActionConfigBasedApi {
  public readonly actionConfig = Screenshot_ActionConfig;
  public readonly endpointPath = '/api/extension/page/screenshot';
}
