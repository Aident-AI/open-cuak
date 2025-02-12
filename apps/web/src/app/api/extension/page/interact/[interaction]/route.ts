import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { InteractPageByInteractionApi } from '~src/app/api/extension/page/interact/[interaction]/InteractPageByInteractionApi';

export const maxDuration = 15;

export const POST = BaseExtensionApiRouteWrapper(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (action?: string) => {
    if (!action) throw new Error('No action provided');
    return new InteractPageByInteractionApi(action as InteractableInteraction);
  },
  { assertUserLoggedIn: true },
);
