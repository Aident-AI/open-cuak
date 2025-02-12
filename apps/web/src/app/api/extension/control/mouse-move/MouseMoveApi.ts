import { MouseMove_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseMove.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class MouseMoveApi extends ActionConfigBasedApi {
  public readonly actionConfig = MouseMove_ActionConfig;
  public readonly endpointPath = '/api/extension/control/mouse-move';
}
