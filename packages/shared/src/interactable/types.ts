import { Protocol } from 'devtools-protocol';
import { serializedNodeWithId } from 'rrweb-snapshot';
import { z } from 'zod';
import { ChromeTab } from '~shared/chrome/Tab';
import { PaginationCursorSchema } from '~shared/cursor/types';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { IConnectionTransport } from '~shared/puppeteer/IConnectionTransport';
import { SerializedAXSnapshotNode } from '~shared/puppeteer/types';

export type INodeId = string;
export type RRSerializedNodeId = serializedNodeWithId['id'];
export type BackendNodeId = Protocol.DOM.BackendNodeId;
export type ObjectId = string;
export type InView = boolean | 'unknown';

export const SNAPSHOT_NANOID_ATTRIBUTE_KEY = 'snapshot-nanoid';

export enum RRNodeType {
  Document = 0,
  DocumentType = 1,
  Element = 2,
  Text = 3,
  CDATA = 4,
  Comment = 5,
}

export const spellOutRRNodeType = (type: RRNodeType): string => {
  switch (type) {
    case 0:
      return 'document';
    case 1:
      return 'document-type';
    case 2:
      return 'element';
    case 3:
      return 'text';
    case 4:
      return 'cdata';
    case 5:
      return 'comment';
    default:
      throw new Error('Invalid node type: ' + type);
  }
};

export const isINodeId = (id: any) => {
  return typeof id === 'string';
};

export const InteractableNodeTreeConfigSchema = z.object({
  maxDepth: z.number().optional(),
  maxAttributeTokens: z.number().optional(),
  hideBoundingBoxes: z.boolean().optional(),
  onlyInView: z.boolean().optional(),
  skipRefreshing: z.boolean().optional(),
  includeDataAttributes: z.boolean().optional(),
  unknownAttributes: z.record(z.string(), z.any()).optional(),
  ignoreFields: z.array(z.string()).optional(),
});
export type InteractableNodeTreeConfig = z.infer<typeof InteractableNodeTreeConfigSchema>;

export const PaginatedInteractableNodeTreeSchema = z.object({
  tree: InteractableObject.TreeNodeSchema,
  cursor: PaginationCursorSchema,
});
export type PaginatedInteractableNodeTree = z.infer<typeof PaginatedInteractableNodeTreeSchema>;

export const MERGED_NODE_PREFIX = 'Merged-';

export type BidirectionalSerializedAXNode = SerializedAXSnapshotNode & {
  parentId?: INodeId;
  childIds?: INodeId[];
  originalParentBackendNodeId?: Protocol.DOM.BackendNodeId;
};

export interface AccessibilityNodeData {
  domNode: Protocol.DOM.Node;
  remoteObject: Protocol.Runtime.RemoteObject;
  ssNode: BidirectionalSerializedAXNode;
}

export type ActiveTabInfo = {
  tab: ChromeTab;
  transport: IConnectionTransport;
  sessionId: string;
};
