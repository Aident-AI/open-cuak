import { ElementHandle } from 'puppeteer-core';
import { IInteractable } from '~shared/interactable/IInteractable';
import { Base_Interaction, IBaseInteractionStatic } from '~shared/interactable/interactions/Base.Interaction';
import { Click_Interaction } from '~shared/interactable/interactions/Click.Interaction';
import { Focus_Interaction } from '~shared/interactable/interactions/Focus.Interaction';
import { Hover_Interaction } from '~shared/interactable/interactions/Hover.Interaction';
import { PressKey_Interaction } from '~shared/interactable/interactions/PressKey.Interaction';
import { SaveCanvasAsPng_Interaction } from '~shared/interactable/interactions/SaveCanvasAsPng.Interaction';
import { Scroll_Interaction } from '~shared/interactable/interactions/Scroll.Interaction';
import { ScrollIntoView_Interaction } from '~shared/interactable/interactions/ScrollIntoView.Interaction';
import { Tap_Interaction } from '~shared/interactable/interactions/Tap.Interaction';
import { Type_Interaction } from '~shared/interactable/interactions/Type.Interaction';
import { Wait_Interaction } from '~shared/interactable/interactions/Wait.Interaction';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

export interface InteractionConstructor extends IBaseInteractionStatic {
  new (node: IInteractable.Node, handle: ElementHandle): Base_Interaction;
}

export const InteractableInteractionRegistry: Record<InteractableInteraction, InteractionConstructor> = {
  [InteractableInteraction.CLICK]: Click_Interaction,
  [InteractableInteraction.FOCUS]: Focus_Interaction,
  [InteractableInteraction.HOVER]: Hover_Interaction,
  // [InteractableInteraction.KEY_DOWN]: KeyDownInteraction,
  // [InteractableInteraction.KEY_UP]: KeyUpInteraction,
  [InteractableInteraction.PRESS_KEY]: PressKey_Interaction,
  [InteractableInteraction.SAVE_CANVAS_AS_PNG]: SaveCanvasAsPng_Interaction,
  [InteractableInteraction.SCROLL]: Scroll_Interaction,
  [InteractableInteraction.SCROLL_INTO_VIEW]: ScrollIntoView_Interaction,
  // [InteractableInteraction.SELECT]: SelectInteraction,
  [InteractableInteraction.TAP]: Tap_Interaction,
  [InteractableInteraction.TYPE]: Type_Interaction,
  [InteractableInteraction.WAIT]: Wait_Interaction,
};
