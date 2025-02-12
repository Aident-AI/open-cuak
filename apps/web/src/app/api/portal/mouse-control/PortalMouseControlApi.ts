import { PortalMouseControl_ActionConfig } from '~shared/messaging/action-configs/portal-actions/PortalMouseControl.ActionConfig';
import { ActionConfigBasedApi } from '~src/app/api/extension/ActionConfigBasedApi';

export class PortalMouseControlApi extends ActionConfigBasedApi {
  public readonly actionConfig = PortalMouseControl_ActionConfig;
  public readonly endpointPath = '/api/portal/mouse-control';
}
