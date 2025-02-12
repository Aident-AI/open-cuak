import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class Untyped_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.UNDEFINED;

  public static description = undefined;

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = z.any();
}

enforceBaseActionConfigStatic(Untyped_ActionConfig);
