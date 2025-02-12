import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

export class Focus_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.FOCUS;
  public static readonly description = 'Focus an element.';
  public static readonly configSchema = z.null();

  public async exec(): Promise<void> {
    await this.handle.focus();
  }
}

enforceIBaseInteractionStatic(Focus_Interaction);
