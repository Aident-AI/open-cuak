import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

export class ScrollIntoView_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.SCROLL_INTO_VIEW;
  public static readonly description =
    'Scroll the element into view. If the element is already in view, this has no effect.';
  public static readonly configSchema = z.null();

  public async exec(): Promise<void> {
    await this.handle.scrollIntoView();
  }
}

enforceIBaseInteractionStatic(ScrollIntoView_Interaction);
