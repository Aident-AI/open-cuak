import { ReadScreen_ActionConfig } from '~shared/messaging/action-configs/page-actions/ReadScreen.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class ReadScreenApi extends ActionConfigBasedApi {
  public readonly actionConfig = ReadScreen_ActionConfig;
  public readonly endpointPath = '/api/extension/page/read-screen';
}
