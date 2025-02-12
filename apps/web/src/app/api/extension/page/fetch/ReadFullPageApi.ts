import { FetchFullPage_ActionConfig } from '~shared/messaging/action-configs/page-actions/FetchFullPage.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class ReadFullPageApi extends ActionConfigBasedApi {
  public readonly actionConfig = FetchFullPage_ActionConfig;
  public readonly endpointPath = '/api/extension/page/read-full-page';
}
