import { MouseWheel_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseWheel.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class MouseWheelApi extends ActionConfigBasedApi {
  public readonly actionConfig = MouseWheel_ActionConfig;
  public readonly endpointPath = '/api/extension/control/mouse-wheel';
}
