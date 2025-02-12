import { MouseClick_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseClick.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class MouseClickApi extends ActionConfigBasedApi {
  public readonly actionConfig = MouseClick_ActionConfig;
  public readonly endpointPath = '/api/extension/control/mouse-click';
}
