import { documentNode, documentTypeNode, serializedNodeWithId } from 'rrweb-snapshot';
import { v4 as UUID } from 'uuid';
import { ChromeTab } from '~shared/chrome/Tab';
import { IInteractable } from '~shared/interactable/IInteractable';
import { InteractableNodeImpl } from '~shared/interactable/InteractableNodeImpl';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import {
  INodeId,
  InteractableNodeTreeConfig,
  InteractableNodeTreeConfigSchema,
  PaginatedInteractableNodeTree,
  RRNodeType,
  isINodeId,
} from '~shared/interactable/types';
import { ALogger } from '~shared/logging/ALogger';
import { TokenizerUtils } from '~shared/utils/TokenizerUtils';

export const DummyTab = { id: -1, status: 'complete' } as ChromeTab;

export class InteractableDomImpl implements IInteractable.Dom {
  // ================================================================================================================
  // Static
  // ================================================================================================================

  public static async genCreateForTab(
    snapshot: serializedNodeWithId,
    tab: ChromeTab = DummyTab,
  ): Promise<InteractableDomImpl> {
    const it = new InteractableDomImpl(snapshot, tab, null, {});
    const { root, dict } = this._serializeToRRDom(snapshot, it as IInteractable.Dom);
    void this._slimTree(root, dict);
    if (!root) throw new Error('Failed to serialize root node');

    it.#root = root;
    it.#dict = dict;
    it.#isLoading = false;
    return it;
  }

  private static _serializeToRRDom(
    snapshot: serializedNodeWithId,
    it: IInteractable.Dom,
  ): { root: IInteractable.Node; dict: Record<INodeId, IInteractable.Node> } {
    if (!snapshot) throw new Error('Invalid snapshot');

    const dict = {} as Record<INodeId, IInteractable.Node>;
    const meta = it.meta;
    const serializeToNode = (node: serializedNodeWithId, parent?: InteractableNodeImpl): IInteractable.Node | null => {
      if (!node) return null;

      const type = node.type as number as RRNodeType;
      if (type === RRNodeType.Document) {
        const { compatMode, childNodes } = node as documentNode;
        if (compatMode) meta.compatMode = compatMode;
        if (!childNodes || childNodes.length < 1) throw new Error('Invalid document node');

        const children = childNodes.map((n) => serializeToNode(n)).filter((n) => !!n);
        if (children.length !== 1) throw new Error('Invalid document node');
        return children[0];
      }
      if (type === RRNodeType.DocumentType) {
        const { name, publicId, systemId } = node as documentTypeNode;
        if (!meta.documentType) meta.documentType = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docType = meta.documentType as any;
        if (name?.length > 1) docType.name = name;
        if (publicId?.length > 1) docType.publicId = publicId;
        if (systemId?.length > 1) docType.systemId = systemId;
        return null;
      }

      const parentId = parent?.iNodeId;
      const children = 'childNodes' in node ? (node.childNodes as serializedNodeWithId[]) : [];
      const childIds = children.map((i) => i.nanoid);
      const nodeData = { ...node, childIds, parentId, childNodes: undefined } as IInteractable.NodeData;
      const rrNode = InteractableNodeImpl.createFromData(nodeData, it, dict, parent);
      if (!rrNode) return null;

      const actualChildren = children.filter((n) => rrNode.childIds.includes(n.nanoid));
      void actualChildren.forEach((n) => serializeToNode(n, rrNode ?? undefined));
      return rrNode;
    };

    const root = serializeToNode(snapshot, undefined);
    if (!root) throw new Error('Failed to serialize root node');
    return { root, dict };
  }

  private static _slimTree(n: IInteractable.Node, dict: Record<INodeId, IInteractable.Node>): void {
    const getNullableChildren = (node: IInteractable.Node): IInteractable.Node[] =>
      node.childIds.map((i) => dict[i]).filter((i) => !!i) as IInteractable.Node[];

    const removeNodeAndReprocessParent = (node: IInteractable.Node): void => {
      if (!node.parent) return;
      if (node.parent.childIds.includes(node.iNodeId))
        throw new Error('The parent should not have the node when removing.');
      delete dict[node.iNodeId];

      stack.push(node.parent as IInteractable.Node);
    };

    const stack: IInteractable.Node[] = [n];

    while (stack.length > 0) {
      const node = stack.pop() as InteractableNodeImpl;
      if (!dict[node.iNodeId]) continue;

      // Remove section nodes with single or no children
      if (node.isCompressibleContainer() && !('text' in (node.attr ?? {}))) {
        const parent = node.parent as InteractableNodeImpl | null;
        if (node.childIds.length < 1) {
          if (parent) {
            parent.removeChildId(node.iNodeId);
            removeNodeAndReprocessParent(node);
          }
        } else if (node.childIds.length === 1) {
          const child = getNullableChildren(node)[0] as InteractableNodeImpl;
          if (parent) {
            child.replaceParentId(parent.iNodeId);
            parent.replaceChildId(node.iNodeId, child.iNodeId);
            removeNodeAndReprocessParent(node);
          } else {
            const grandChildren = getNullableChildren(child);
            node.setChildIds(grandChildren.map((i) => i.iNodeId));
            grandChildren.forEach((i) => (i as InteractableNodeImpl).replaceParentId(node.iNodeId));
            removeNodeAndReprocessParent(child);
          }
        }
      }

      getNullableChildren(node).forEach((child) => stack.push(child as IInteractable.Node));
    }
  }

  // ================================================================================================================
  // Public Instance
  // ================================================================================================================

  public constructor(
    snapshot: serializedNodeWithId,
    tab: ChromeTab,
    root: IInteractable.Node | null,
    rrNodeDict: Record<INodeId, IInteractable.Node>,
    isLoading: boolean = true,
  ) {
    this.#snapshot = snapshot;
    this.#tab = tab;
    this.#updatedAt = Date.now();
    this.#uuid = UUID();
    this.#root = root;
    this.#dict = rrNodeDict;
    this.#snapshotDict = this.#serializeSnapshotDict(snapshot);
    this.#isLoading = isLoading;
  }

  // getters
  public get meta(): Record<string, unknown> {
    return this.#meta;
  }

  public get tab(): ChromeTab {
    return this.#tab;
  }

  public get updatedAt(): number {
    return this.#updatedAt;
  }

  public get uuid(): string {
    return this.#uuid;
  }

  public get nodeTree(): object {
    return this.getRoot().toTree();
  }

  public get snapshot(): serializedNodeWithId {
    return this.#snapshot;
  }

  public get root(): IInteractable.Node | null {
    if (!this.#root) throw new Error('Root not found');
    return this.#root;
  }

  public get dict(): Record<INodeId, IInteractable.Node> {
    return this.#dict;
  }

  // helper
  public async refresh(expiryInMs: number = 300): Promise<void> {
    ALogger.warn({ context: 'Not implemented yet', expiryInMs });
    throw new Error('Method not implemented.');
  }

  public isLoading(): boolean {
    return this.#isLoading;
  }

  public isReady(): boolean {
    return !this.isLoading();
  }

  public setIsLoading(isLoading: boolean): void {
    this.#isLoading = isLoading;
  }

  public overrideValues(it: InteractableDomImpl): void {
    this.#snapshot = it.snapshot;
    this.#dict = it.getNodeDict();
    this.#root = it.getRoot();
    this.#updatedAt = it.updatedAt;
    this.#uuid = it.uuid;
  }

  // data accessing
  public async fetchNodeTree(
    id?: string,
    config?: InteractableNodeTreeConfig | undefined,
  ): Promise<InteractableObject.TreeNode> {
    // TODO: add the logic to refresh if recorder is not on

    const targetId = !id || id.length < 1 || id === 'undefined' || id === 'root' ? this.getRoot().iNodeId : id;
    if (!isINodeId(targetId)) throw new Error('Invalid nodeId');
    const target = this.getNodeById(targetId);
    if (!target) throw new Error('Node not found');

    const typedConfig = InteractableNodeTreeConfigSchema.parse(config ?? {});
    if (!typedConfig.unknownAttributes) typedConfig.unknownAttributes = {};
    const tree = target.toTree(typedConfig);
    ALogger.warn({
      context: 'Unknown Ignored Attr',
      stack: 'Interactable',
      unknownAttributes: Object.keys(typedConfig.unknownAttributes).length < 1 ? 'none' : typedConfig.unknownAttributes,
    });

    if (typedConfig.onlyInView) {
      const inViewTree = this.#removeNotInView(tree);
      if (!inViewTree) throw new Error('All nodes are not in view');
      return inViewTree;
    }
    return tree;
  }

  public async fetchViewTree(
    config?: InteractableNodeTreeConfig | undefined,
  ): Promise<InteractableObject.TreeNode | undefined> {
    return await this.fetchNodeTree(undefined, { ...config, onlyInView: true });
  }

  public async fetchFullTree(
    config?: InteractableNodeTreeConfig | undefined,
  ): Promise<InteractableObject.TreeNode | undefined> {
    return await this.fetchNodeTree(undefined, { ...config, onlyInView: false });
  }

  public async fetchPaginatedTree(
    maxTokenPerPage?: number,
    hideBoundingBoxes?: boolean,
    config?: InteractableNodeTreeConfig | undefined,
  ): Promise<PaginatedInteractableNodeTree | undefined> {
    // type NodeType = IInteractable.Node;
    const getTokenCount = (chunk: InteractableObject.TreeNode): number => {
      const str = JSON.stringify(chunk);
      return TokenizerUtils.countTokens(str);
    };
    if (!maxTokenPerPage || maxTokenPerPage < 1) {
      const tree = await this.fetchFullTree({ hideBoundingBoxes, ...config });
      if (!tree) throw new Error('Failed to fetch full tree');

      return {
        tree,
        cursor: {
          currentPage: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
          pageSizeByToken: getTokenCount(tree),
          maxTokenPerPage: maxTokenPerPage ?? -1,
        },
      };
    }

    if (maxTokenPerPage < 500)
      throw new Error('Invalid maxTokenPerPage, must be at least 500 or -1 for no limitation.');
    else throw new Error('Currently only no limitation is supported.');
  }

  public async fetchPaginatedTreeByCursor(cursorId: string): Promise<PaginatedInteractableNodeTree | undefined> {
    ALogger.warn({ context: 'Not implemented yet', cursorId });
    throw new Error('Method not implemented.');
  }

  public getRoot(): IInteractable.Node {
    if (!this.#root) throw new Error('Root not found');
    return this.#root;
  }

  public getNodeDict(): Record<INodeId, IInteractable.Node> {
    return this.#dict;
  }

  public getNodes(): IInteractable.Node[] {
    return Object.values(this.getNodeDict());
  }

  public getNodeById(id: INodeId): IInteractable.Node | undefined {
    return this.#dict[id];
  }

  public getNodeBySnapshotNanoid(nanoid: string): IInteractable.Node | undefined {
    let pt = this.#snapshotDict[nanoid];
    if (!pt) return undefined;

    while (pt) {
      if (this.#dict[pt.nanoid]) return this.#dict[pt.nanoid];
      if (!('parentId' in pt)) throw new Error('Invalid snapshot node without parentId');
      pt = this.#snapshotDict[pt.parentId as string];
    }
    ALogger.warn({ context: 'Node not found for snapshotId:', nanoid });
    return this.getRoot() as IInteractable.Node;
  }

  // ================================================================================================================
  // Private Instance
  // ================================================================================================================

  #snapshot: serializedNodeWithId;
  #snapshotDict: Record<INodeId, serializedNodeWithId> = {};
  #dict: Record<INodeId, IInteractable.Node>;
  #meta: Record<string, unknown> = {};
  #isLoading: boolean = true;
  #root: IInteractable.Node | null;
  #tab: ChromeTab;
  #updatedAt: number;
  #uuid: string;

  #serializeSnapshotDict(snapshot: serializedNodeWithId): Record<INodeId, serializedNodeWithId> {
    const dict = {} as Record<INodeId, serializedNodeWithId & { parentId?: INodeId }>;

    const dfs = (node: serializedNodeWithId, parent?: serializedNodeWithId): void => {
      if (!node) return;
      dict[node.nanoid] = { ...node, parentId: parent?.nanoid };
      if ('childNodes' in node) (node as documentNode).childNodes.forEach((i) => dfs(i, node));
    };
    void dfs(snapshot);

    return dict;
  }

  #removeNotInView = (root: InteractableObject.TreeNode): InteractableObject.TreeNode | undefined => {
    // Perform a breadth-first traversal to gather nodes
    const queue: InteractableObject.TreeNode[] = [root];
    const nodes: InteractableObject.TreeNode[] = [];
    const dict: Map<string, InteractableObject.TreeNode> = new Map<string, InteractableObject.TreeNode>();

    while (queue.length > 0) {
      const node = queue.shift()!;
      nodes.push(node);
      if (node.children) {
        for (const child of node.children) {
          dict.set(child.id, node); // For fast parent retrieval
        }
        queue.push(...node.children);
      }
    }

    // Process nodes from bottom to top
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      // If the current node is not in view and has no valid children, mark it for removal
      if (!node.inView && (!node.children || node.children.length === 0)) {
        // Find and remove the node from its parent's children
        const parent = dict.get(node.id);
        if (!parent) continue;
        const inViewChildren = parent.children!.filter((child) => child.id !== node.id);
        parent.children = inViewChildren.length > 0 ? inViewChildren : undefined;
      }
    }

    if (!root.inView && (!root.children || root.children.length === 0)) {
      return undefined; // All nodes are not in view
    }

    return root;
  };
}
