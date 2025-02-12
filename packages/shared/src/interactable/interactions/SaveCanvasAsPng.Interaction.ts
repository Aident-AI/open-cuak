import { z } from 'zod';
import { InteractableNodeRole } from '~shared/interactable/InteractableNodeRole';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { SNAPSHOT_NANOID_ATTRIBUTE_KEY } from '~shared/interactable/types';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export class SaveCanvasAsPng_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.SAVE_CANVAS_AS_PNG;
  public static readonly description = 'Save the target canvas element to be a PNG image.';
  public static readonly configSchema = z.null();

  public async exec(
    _config: z.infer<typeof SaveCanvasAsPng_Interaction.configSchema>,
    context: IActionConfigExecContext,
  ): Promise<void> {
    if (this.node.role !== InteractableNodeRole.CANVAS)
      throw new Error('SaveCanvasAsPng Interaction can only be used on a canvas element.');

    const page = context.getInteractableService().getPageOrThrow();
    const target = this.node.iNodeId;
    page.$eval(
      `canvas[${SNAPSHOT_NANOID_ATTRIBUTE_KEY}="${target}"]`,
      (canvas, target) => {
        const dataUrl = canvas.toDataURL('image/png');
        const temp = document.createElement('a');
        temp.id = 'temp';
        temp.href = dataUrl;
        temp.download = target + '.png';
        temp.click();
      },
      target,
    );
  }
}

enforceIBaseInteractionStatic(SaveCanvasAsPng_Interaction);
