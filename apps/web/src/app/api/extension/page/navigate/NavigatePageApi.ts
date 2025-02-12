import { NavigatePage_ActionConfig } from '~shared/messaging/action-configs/page-actions/NavigatePage.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class NavigatePageApi extends ActionConfigBasedApi {
  public readonly actionConfig = NavigatePage_ActionConfig;
  public readonly endpointPath = '/api/extension/page/navigate';
}
