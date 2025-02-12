import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

export class Hover_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.HOVER;
  public static readonly description = 'Hover over an element.';
  public static readonly configSchema = z.null();

  public async exec(): Promise<void> {
    await this.handle.hover();
  }
}

enforceIBaseInteractionStatic(Hover_Interaction);
