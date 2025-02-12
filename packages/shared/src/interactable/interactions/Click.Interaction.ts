import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

export class Click_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.CLICK;
  public static readonly description = 'Click an element.';
  public static readonly configSchema = z.null();

  public async exec(): Promise<void> {
    await this.handle.click();
  }
}

enforceIBaseInteractionStatic(Click_Interaction);
