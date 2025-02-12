import { z } from 'zod';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class Ping_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.PING;

  public static description = undefined;

  public static requestPayloadSchema = z.any();

  public static responsePayloadSchema = z.object({ response: z.literal('pong') });

  public static async exec(): Promise<z.infer<typeof this.responsePayloadSchema>> {
    return { response: 'pong' };
  }
}

enforceBaseActionConfigStatic(Ping_ActionConfig);
