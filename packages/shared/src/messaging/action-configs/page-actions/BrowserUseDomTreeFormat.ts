import { IInteractable } from '~shared/interactable/IInteractable';

export class BrowserUseDomTreeFormat {
  public static async genDomTree(it: IInteractable.Dom) {
    const tree = await it.fetchNodeTree();
    return tree;
  }
}
