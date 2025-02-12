import { ElementHandle } from 'puppeteer-core';
import { ChromeTab } from '~shared/chrome/Tab';
import { BoundingBox, InteractableObject } from '~shared/interactable/InteractableObject';
import {
  INodeId,
  InView,
  InteractableNodeTreeConfig,
  PaginatedInteractableNodeTree,
  RRNodeType,
} from '~shared/interactable/types';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';

import type { serializedNodeWithId } from 'rrweb-snapshot';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace IInteractable {
  export interface Dom {
    // getters
    get tab(): ChromeTab;
    get updatedAt(): number;
    get uuid(): string;
    get nodeTree(): object;
    get meta(): Record<string, unknown>;
    get snapshot(): serializedNodeWithId;
    get root(): IInteractable.Node | null;
    get dict(): Record<INodeId, IInteractable.Node>;

    // data accessing
    fetchNodeTree(id?: string, config?: InteractableNodeTreeConfig): Promise<InteractableObject.TreeNode | undefined>;
    fetchViewTree(config?: InteractableNodeTreeConfig | undefined): Promise<InteractableObject.TreeNode | undefined>;
    fetchFullTree(config?: InteractableNodeTreeConfig | undefined): Promise<InteractableObject.TreeNode | undefined>;
    fetchPaginatedTree(
      maxPageTokenSize?: number,
      hideBoundingBoxes?: boolean,
      config?: InteractableNodeTreeConfig | undefined,
    ): Promise<PaginatedInteractableNodeTree | undefined>;
    fetchPaginatedTreeByCursor(cursorId: string): Promise<PaginatedInteractableNodeTree | undefined>;
    getRoot(): IInteractable.Node;
    getNodeDict(): Record<INodeId, IInteractable.Node>;
    getNodes(): IInteractable.Node[];
    getNodeById(id: INodeId): IInteractable.Node | undefined;
    getNodeBySnapshotNanoid(nanoid: string): Node | undefined;

    // helpers
    refresh(expiryInMs?: number): Promise<void>;
    isLoading(): boolean;
    setIsLoading(isLoading: boolean): void;
    isReady(): boolean;
  }

  export interface Node {
    get iNodeId(): INodeId;
    get parentId(): INodeId | null;
    get childIds(): INodeId[];
    get parent(): IInteractable.Node | null;
    get children(): IInteractable.Node[];

    get boundingBox(): BoundingBox;
    get clickable(): boolean;
    get inView(): InView;
    get attr(): string | object | undefined;
    get rawData(): NodeData;
    get role(): string;
    get type(): RRNodeType;
    get typeString(): string;

    // page interaction
    fetchHandleOrThrow(): Promise<ElementHandle>;
    performInteraction(action: InteractableInteraction, config?: unknown): Promise<void>;
    fetchNodePath(): Promise<IInteractable.Node[]>;
    fetchNodePathDescription(): Promise<string>;

    // helpers
    getInteractable(): IInteractable.Dom;
    getTag(): string;
    isLeaf(): boolean;
    isRoot(): boolean;
    toCompleteObject(): object;
    toObject(): InteractableObject.Node;
    toSimplifiedObject(): InteractableObject.Node;
    toTree(config?: InteractableNodeTreeConfig): InteractableObject.TreeNode;
  }

  export type NodeData = serializedNodeWithId & {
    parentId?: INodeId;
    childIds: INodeId[];
    childNodes: undefined;
  };
}
