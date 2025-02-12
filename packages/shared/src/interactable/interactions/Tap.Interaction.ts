import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

export class Tap_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.TAP;
  public static readonly description = 'Tap on an element.';
  public static readonly configSchema = z.null();

  public async exec(): Promise<void> {
    await this.handle.tap();
  }
}

enforceIBaseInteractionStatic(Tap_Interaction);
