import { z } from 'zod';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class FetchInteractableNodeDict_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_INTERACTABLE_NODE_DICT;

  public static description = undefined;

  public static requestPayloadSchema = z.object({ tabId: z.number() });

  public static responsePayloadSchema = z.object({
    nodeDict: InteractableObject.NodeDictSchema,
    updatedAt: z.number(),
  });
}

enforceBaseActionConfigStatic(FetchInteractableNodeDict_ActionConfig);
