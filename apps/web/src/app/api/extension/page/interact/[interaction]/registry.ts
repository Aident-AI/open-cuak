import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { InteractPageByInteractionApi } from '~src/app/api/extension/page/interact/[interaction]/InteractPageByInteractionApi';

export const AllowedInteractPageApis = Object.values(InteractableInteraction)
  .map((key) => new InteractPageByInteractionApi(key))
  .filter((api) => api.interaction !== InteractableInteraction.WAIT);
