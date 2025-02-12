import { z } from 'zod';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { InteractableNodeTreeConfigSchema } from '~shared/interactable/types';
import { Base_ActionConfig, enforceBaseActionConfigStatic } from '~shared/messaging/action-configs/Base.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';

export class FetchInteractableTree_ActionConfig extends Base_ActionConfig {
  public static action = ServiceWorkerMessageAction.FETCH_INTERACTABLE_TREE;

  public static description = undefined;

  public static requestPayloadSchema = z.object({
    nodeId: z.string().optional(),
    config: InteractableNodeTreeConfigSchema.optional(),
  });

  public static responsePayloadSchema = z.object({
    tree: InteractableObject.TreeNodeSchema,
  });
}

enforceBaseActionConfigStatic(FetchInteractableTree_ActionConfig);
