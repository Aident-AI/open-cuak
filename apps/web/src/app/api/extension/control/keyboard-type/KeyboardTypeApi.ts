import { KeyboardType_ActionConfig } from '~shared/messaging/action-configs/control-actions/KeyboardType.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class KeyboardTypeApi extends ActionConfigBasedApi {
  public readonly actionConfig = KeyboardType_ActionConfig;
  public readonly endpointPath = '/api/extension/control/keyboard-type';
}
