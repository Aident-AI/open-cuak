import { z } from 'zod';
import { ALogger } from '~shared/logging/ALogger';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class Close_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.CLOSE;

  public static description = undefined;

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = z.void();

  public static async exec(): Promise<z.infer<typeof this.responsePayloadSchema>> {
    await ALogger.close();
  }
}

enforceBaseActionConfigStatic(Close_ActionConfig);
