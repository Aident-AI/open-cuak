import { oneLine } from 'common-tags';
import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

export class Type_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.TYPE;
  public static readonly description =
    'Type string into the element. To press a special key (e.g. `Control` or `ArrowDown`), use `press` interaction.';
  public static readonly configSchema = z.object({
    text: z.string(),
    delay: z
      .number()
      .optional()
      .describe(
        oneLine`
          Delay in milliseconds. Defaults to 0. For example, set it to 100 to type slower, like a human.
        `,
      )
      .default(50),
  });

  public async exec(config?: z.infer<typeof Type_Interaction.configSchema>): Promise<void> {
    const { text, delay } = Type_Interaction.configSchema.parse(config);
    const delayConfig = delay ? { delay } : undefined;
    await this.handle.type(text, delayConfig);
  }
}

enforceIBaseInteractionStatic(Type_Interaction);
