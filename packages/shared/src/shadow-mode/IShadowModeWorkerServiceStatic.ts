import { InteractableObject } from '~shared/interactable/InteractableObject';
import { IBaseServiceStatic } from '~shared/services/IBaseServiceStatic';
import { RRWebEvent } from '~shared/shadow-mode/RREvent';
import { ShadowModeEvent } from '~shared/shadow-mode/ShadowModeEvent';
import { ShadowModeSession } from '~shared/shadow-mode/ShadowModeSession';

export interface IShadowModeWorkerServiceStatic extends IBaseServiceStatic {
  startShadowMode(): Promise<void>;
  stopShadowMode(): Promise<void>;
  completeAnalysis(): Promise<void>;
  appendEvent(event: RRWebEvent, it: InteractableObject.TreeNode): Promise<void>;
  getSession(): ShadowModeSession;
  getEvents(): ShadowModeEvent[];
}
