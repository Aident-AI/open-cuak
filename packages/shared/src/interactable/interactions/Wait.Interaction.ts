import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { WaitUtils } from '~shared/utils/WaitUtils';

export class Wait_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.WAIT;
  public static readonly description = 'Wait for a specified amount of time.';
  public static readonly configSchema = z.object({
    delay: z.number().optional().describe('Delay in milliseconds.'),
    until: z
      .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
      .optional()
      .describe('Wait until a specific condition is met. Those are Puppeteer lifecycle events.'),
  });

  public async exec(config?: z.infer<typeof Wait_Interaction.configSchema>): Promise<void> {
    const { delay, until } = Wait_Interaction.configSchema.parse(config);
    const promises = [];
    if (delay) promises.push(WaitUtils.wait(delay));
    if (until) promises.push(this.handle.frame.waitForNavigation({ waitUntil: until }));

    await Promise.any(promises);
  }
}

enforceIBaseInteractionStatic(Wait_Interaction);
