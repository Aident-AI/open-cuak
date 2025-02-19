import { MouseDrag_ActionConfig } from '~shared/messaging/action-configs/control-actions/MouseDrag.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class MouseDragApi extends ActionConfigBasedApi {
  public readonly actionConfig = MouseDrag_ActionConfig;
  public readonly endpointPath = '/api/extension/control/mouse-drag';
}
