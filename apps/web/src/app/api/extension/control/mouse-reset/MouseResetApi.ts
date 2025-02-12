import { MouseReset_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseReset.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class MouseResetApi extends ActionConfigBasedApi {
  public readonly actionConfig = MouseReset_ActionConfig;
  public readonly endpointPath = '/api/extension/control/mouse-reset';
}
