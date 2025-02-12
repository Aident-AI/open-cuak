import { z } from 'zod';
import { Base_Interaction, enforceIBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  BOTTOM = 'bottom',
  TOP = 'top',
}

export class Scroll_Interaction extends Base_Interaction {
  public static readonly type = InteractableInteraction.SCROLL;
  public static readonly description =
    "Scrolls the page by a specified amount in a given direction, defaulting to one viewport's height if unspecified.";
  public static readonly configSchema = z.object({
    direction: z
      .nativeEnum(ScrollDirection)
      .optional()
      .default(ScrollDirection.DOWN)
      .describe('Sets scroll direction. use `bottom` or `top` to scroll to the bottom or top of the page.'),
    amount: z
      .number()
      .optional()
      .describe('Sets scroll distance: `1` for a full viewport; ignored for `bottom` or `top`.'),
  });

  public async exec(config?: z.infer<typeof Scroll_Interaction.configSchema>): Promise<void> {
    const { direction, amount } = Scroll_Interaction.configSchema.parse(config);
    const scrollAmount = amount ?? 1;
    const page = this.handle.frame.page();
    const scrollEval = (x: number, y: number) =>
      page.evaluate(({ x, y }) => window.scrollBy(window.innerWidth * x, window.innerHeight * y), { x, y });
    switch (direction) {
      case ScrollDirection.UP:
        await scrollEval(0, -scrollAmount);
        break;
      case ScrollDirection.DOWN:
        await scrollEval(0, scrollAmount);
        break;
      case ScrollDirection.LEFT:
        await scrollEval(-scrollAmount, 0);
        break;
      case ScrollDirection.RIGHT:
        await scrollEval(scrollAmount, 0);
        break;
      case ScrollDirection.TOP:
        await page.evaluate(() => window.scrollTo(0, 0));
        break;
      case ScrollDirection.BOTTOM:
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        break;
      default:
        throw new Error(`Unsupported scroll direction: ${direction}`);
    }
  }
}

enforceIBaseInteractionStatic(Scroll_Interaction);
