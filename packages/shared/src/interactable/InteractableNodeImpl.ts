import _ from 'lodash';
import { ElementHandle } from 'puppeteer-core';
import { commentNode, elementNode, textNode } from 'rrweb-snapshot';
import { SANDBOX_PAGE_INJECTION_TARGET_ID } from '~shared/injection/const';
import { IInteractable } from '~shared/interactable/IInteractable';
import {
  AllowedInteractableNodeAttributes,
  IgnoredInteractableNodeAttributes,
} from '~shared/interactable/InteractableNodeAttributes';
import { InteractableNodeRole, getRoleFromTag } from '~shared/interactable/InteractableNodeRole';
import { BoundingBox, InteractableObject } from '~shared/interactable/InteractableObject';
import {
  INodeId,
  InView,
  InteractableNodeTreeConfig,
  RRNodeType,
  SNAPSHOT_NANOID_ATTRIBUTE_KEY,
  spellOutRRNodeType,
} from '~shared/interactable/types';
import { ALogger } from '~shared/logging/ALogger';
import { InteractableInteraction } from '~shared/messaging/action-configs/page-actions/types';
import { ObjectUtils } from '~shared/utils/ObjectUtils';
import { TokenizerUtils } from '~shared/utils/TokenizerUtils';

export const IgnoredTags = new Set(['link', 'style', 'script', 'noscript']);

export class InteractableNodeImpl implements IInteractable.Node {
  // ================================================================================================================
  // Public Static
  // ================================================================================================================

  public static createFromData(
    data: IInteractable.NodeData,
    dom: IInteractable.Dom,
    nodeDict: Record<INodeId, IInteractable.Node>,
    parent?: InteractableNodeImpl,
  ): InteractableNodeImpl | null {
    const node = new InteractableNodeImpl(data, dom, nodeDict);

    const prepareBlankNode = (): null => {
      if (parent) parent.removeChildId(node.iNodeId);
      return null;
    };

    if (node.type === RRNodeType.Text) {
      if (!node.attr || !('text' in node.attr) || !node.attr.text) return prepareBlankNode();
      const value = (node.attr.text as string).trim();
      if (!value || value.length < 1) return prepareBlankNode();

      if (parent?.type === Number(RRNodeType.Element)) {
        const textContent = (data as textNode).textContent;
        if (!textContent) return prepareBlankNode();

        if (parent && parent.childIds.length < 2) {
          parent.#overrideAttr({ ...parent.attr, text: textContent });
          parent.removeChildId(node.iNodeId);

          if (parent.role === InteractableNodeRole.TITLE) {
            dom.meta.title = textContent;
            const grandParent = parent.parent as InteractableNodeImpl | null;
            if (!grandParent) throw new Error('Parent not found for title node');
            grandParent.removeChildId(parent.iNodeId);
            return prepareBlankNode();
          }

          return prepareBlankNode();
        }
      }
    }
    if (node.role === InteractableNodeRole.META) {
      if (node.childIds.length > 0) throw new Error('Invalid meta node: having children');
      if (!node.attr) return prepareBlankNode();

      const metaData = node.attr as Record<string, unknown>;
      const meta = node.getInteractable().meta;
      if (metaData.charset) meta.charset = metaData.charset;
      else if (metaData.itemprop && metaData.content) meta[metaData.itemprop as string] = metaData.content;
      else if (metaData.name && metaData.content) meta[metaData.name as string] = metaData.content;
      else if (metaData.name && metaData.value) meta[metaData.name as string] = metaData.value;
      else if (metaData.property && metaData.content) meta[metaData.property as string] = metaData.content;
      else if (metaData['http-equiv'] && metaData.content) meta[metaData['http-equiv'] as string] = metaData.content;
      else ALogger.warn({ context: 'Invalid meta node: no valid meta data found', data });
      return prepareBlankNode();
    }
    if (IgnoredTags.has(node.getTag())) return prepareBlankNode();
    if (node.getTag() === 'iframe') {
      if (node.attr && 'name' in node.attr && node.attr.name === SANDBOX_PAGE_INJECTION_TARGET_ID)
        return prepareBlankNode();
    }
    if (node.isSVG()) {
      node.#overrideAttr({});
      node.childIds.forEach((id) => node.removeChildId(id));
    }

    const id = node.iNodeId;
    if (nodeDict[id]) ALogger.warn({ context: 'Duplicate node id:', id, existing: nodeDict[id], incoming: node });
    nodeDict[id] = node as IInteractable.Node;
    return node;
  }

  // ================================================================================================================
  // Public Instance
  // ================================================================================================================

  public constructor(data: IInteractable.NodeData, dom: IInteractable.Dom, dict: Record<INodeId, IInteractable.Node>) {
    this.#data = data;
    this.#dom = dom;
    this.#dict = dict;
  }

  // getters
  public get iNodeId(): INodeId {
    return this.#data.nanoid;
  }

  public get parentId(): INodeId | null {
    return this.#data.parentId?.toString() ?? null;
  }

  public get childIds(): INodeId[] {
    return this.#data.childIds.map((i) => i.toString());
  }

  public get parent(): IInteractable.Node | null {
    if (!this.parentId) return null;
    const parent = this.#dict[this.parentId];
    if (!parent) throw new Error('Parent not found. id=' + this.parentId);
    return parent;
  }

  public get children(): IInteractable.Node[] {
    return this.childIds.map((id: INodeId) => {
      const child = this.#dict[id];
      if (!child) throw new Error('Child not found. id=' + id);
      return child;
    });
  }

  public get boundingBox(): BoundingBox {
    if (this.type !== RRNodeType.Element || !('rect' in this.#data)) return 'none';

    const rect = this.#data.rect as DOMRect;
    const { x, y, width: w, height: h } = rect;
    if (x === 0 && y === 0 && w === 0 && h === 0) return 'none';
    return ObjectUtils.roundToDecimal({ x, y, w, h }, 2) as BoundingBox;
  }

  public get inView(): InView {
    return 'inView' in this.#data ? (this.#data.inView as boolean) : 'unknown';
  }

  public get type(): RRNodeType {
    return this.#data.type as unknown as RRNodeType;
  }

  public get typeString(): string {
    return spellOutRRNodeType(this.type);
  }

  public get rawData(): IInteractable.NodeData {
    return this.#data;
  }

  public get role(): InteractableNodeRole {
    if (this.type !== RRNodeType.Element) return this.typeString as InteractableNodeRole;
    return getRoleFromTag(this.getTag());
  }

  public get attr(): object | undefined {
    if (this.#overriddenName) return this.#overriddenName;

    const data = this.#data as unknown;
    switch (this.type) {
      case RRNodeType.Document:
      case RRNodeType.DocumentType: {
        throw new Error('Invalid node type: ' + this.typeString);
      }
      case RRNodeType.Element: {
        const d = data as elementNode;
        const attr = _.cloneDeep(d.attributes ?? {}) as Record<string, unknown>;

        // remove tags
        delete attr.class; // TODO: make whether to show style configurable
        delete attr.style; // TODO: make whether to show style configurable
        delete attr.id;
        delete attr[SNAPSHOT_NANOID_ATTRIBUTE_KEY];
        delete attr.ping;
        if (attr.src && typeof attr.src === 'string' && attr.src.startsWith('data:')) delete attr.src; // remove data values
        if (this.role === InteractableNodeRole.LINK) delete attr.href; // TODO: make whether to show href configurable
        if (this.role === InteractableNodeRole.IMAGE || this.role === InteractableNodeRole.VIDEO_SOURCE)
          delete attr.src;
        if (attr.role && attr.role === this.role) delete attr.role;

        const attrAria = {} as Record<string, unknown>;
        const attrData = {} as Record<string, unknown>;
        for (const key in attr) {
          if (attr[key] === undefined || attr[key] === null) delete attr[key];
          if (key.startsWith('aria-')) {
            const value = attr[key];
            const newKey = key.replace('aria-', '');
            if (!attr[newKey] || attr[newKey] !== value) attrAria[newKey] = value;

            delete attr[key];
          }
          if (key.startsWith('data-')) {
            const value = attr[key];
            const newKey = key.replace('data-', '');
            if (!attr[newKey] || attr[newKey] !== value) attrData[newKey] = value;

            delete attr[key];
          }
        }

        // modify tags
        if (this.role === InteractableNodeRole.HEADING) {
          attr.level = this.getTag();
          delete attrAria.level;
        }
        if (this.role === InteractableNodeRole.INPUT && this.getTag() === 'textarea') attr['multiLine'] = true;

        // add tags
        if (Object.keys(attrAria).length > 0) attr.aria = attrAria;
        if (Object.keys(attrData).length > 0) attr.data = attrData;
        if (this.role === InteractableNodeRole.TEXT && this.getTag() !== 'text') attr.tag = this.getTag();
        if (this.role === InteractableNodeRole.UNKNOWN && this.getTag()) attr.tag = this.getTag();

        return { isSVG: d.isSVG, needBlock: d.needBlock, ...attr };
      }
      case RRNodeType.Text: {
        const d = data as textNode;
        return !d.isStyle ? { text: d.textContent } : undefined; // TODO: make whether to show style configurable
      }
      case RRNodeType.CDATA: {
        return undefined;
      }
      case RRNodeType.Comment: {
        const { textContent } = this.#data as commentNode;
        return { text: textContent };
      }
      default:
        throw new Error('Invalid node type: ' + this.typeString);
    }
  }

  public get clickable(): boolean {
    if (this.role === InteractableNodeRole.LINK && this.getHref()) return true;
    return false;
  }

  // page interaction
  public getInteractable(): IInteractable.Dom {
    return this.#dom as IInteractable.Dom;
  }

  public async fetchHandleOrThrow(): Promise<ElementHandle> {
    throw new Error('Method not implemented.');
  }

  public async performInteraction(action: InteractableInteraction, config?: unknown): Promise<void> {
    ALogger.info({ context: 'InteractableNode.performInteraction', action, config });
    throw new Error('Method not implemented.');
  }

  public async fetchNodePath(): Promise<IInteractable.Node[]> {
    const path = [] as IInteractable.Node[];
    let pointer: IInteractable.Node | null = this as IInteractable.Node;
    while (pointer) {
      path.unshift(pointer);
      pointer = pointer.parent;
    }
    return path;
  }

  public async fetchNodePathDescription(): Promise<string> {
    const path = await this.fetchNodePath();
    let descriptions = '';
    path.forEach((n, i) => (descriptions += i === 0 ? ` > ${n.role}` : `[${i.toString()}] > ${n.role}`));
    return descriptions;
  }

  public getHref(): string | undefined {
    if (this.role !== 'link') return undefined;
    if (!this.rawData || !('attributes' in this.rawData)) return undefined;
    if (!this.rawData?.attributes) return undefined;

    const attr = this.rawData.attributes as object;
    if (!attr || !('href' in attr)) return undefined;
    const href = attr.href as string;
    return href && href.length > 0 ? href : undefined;
  }

  public getTag(): string {
    if (this.type !== RRNodeType.Element) return this.typeString;
    return (this.#data as unknown as elementNode).tagName;
  }

  // helpers
  public isRoot(): boolean {
    return !this.parentId;
  }

  public isLeaf(): boolean {
    return this.childIds.length < 1;
  }

  public isElement(): boolean {
    return this.type === RRNodeType.Element;
  }

  public isSVG(): boolean {
    return this.isElement() && ((this.#data as unknown as elementNode).isSVG ?? false);
  }

  public isCompressibleContainer(): boolean {
    return this.role === InteractableNodeRole.SECTION || this.role === InteractableNodeRole.LIST;
  }

  public toSimplifiedObject(): InteractableObject.Node {
    const obj = this.#data;
    return this.#prettifyToObject(obj) as InteractableObject.Node;
  }

  public toCompleteObject(): object {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonObj = {} as any;
    const properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this));

    for (const prop of properties) {
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), prop);
      if (descriptor && typeof descriptor.get === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jsonObj[prop] = (this as any)[prop];
      }
    }

    return this.#prettifyToObject(jsonObj) as InteractableObject.Node;
  }

  public toObject(): InteractableObject.Node {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonObj = this.toCompleteObject() as any;
    jsonObj.id = this.iNodeId;

    const unwantedKeys = ['iNodeId', 'parent', 'children', 'type', 'typeString', 'rawData', 'textContent', 'rect'];
    for (const key of unwantedKeys) delete jsonObj[key];
    if (!jsonObj.parentId) delete jsonObj.parentId;
    if (!jsonObj.boundingBox || jsonObj.boundingBox === 'none') delete jsonObj.boundingBox;
    if (!jsonObj.inView || jsonObj.inView === 'unknown') delete jsonObj.inView;
    for (const key in jsonObj) {
      const value = jsonObj[key];
      if (!value) delete jsonObj[key];
      if (typeof value === 'string' && value.length < 1) delete jsonObj[key];
      if (Array.isArray(value) && value.length < 1) delete jsonObj[key];
      if (typeof value === 'object') {
        const keys = Object.keys(value);
        for (const k of keys) {
          if (value[k] === undefined) delete value[k];
          if (typeof value[k] === 'string' && value[k].length < 1) delete value[k];
        }
        if (Object.keys(value).length < 1) delete jsonObj[key];
      }
    }

    return InteractableObject.NodeSchema.parse(jsonObj);
  }

  public toTree(config?: InteractableNodeTreeConfig): InteractableObject.TreeNode {
    const { maxDepth, hideBoundingBoxes, maxAttributeTokens } = config ?? {};
    const returnTruncatedTree = (treeNode: InteractableObject.TreeNode): InteractableObject.TreeNode => {
      if (!maxAttributeTokens) return treeNode;
      return this.#truncateNodeAttributes(treeNode, maxAttributeTokens);
    };

    const nextDepth = !maxDepth || maxDepth < 0 ? -1 : maxDepth - 1;
    const raw = _.cloneDeep(this.toObject()) as InteractableObject.Node;
    delete raw.parentId;
    delete raw.childIds;

    const record = config?.unknownAttributes;
    for (const key in raw.attr) {
      if (key === 'data' || key === 'aria') continue;
      if (AllowedInteractableNodeAttributes.has(key)) continue;

      if (record && !IgnoredInteractableNodeAttributes.has(key)) {
        if (!record[key]) record[key] = [];
        record[key].push(raw.attr[key]);
      }
      delete raw.attr[key];
    }
    if (raw.attr?.data && !config?.includeDataAttributes) delete raw.attr.data;
    if (raw.attr?.aria) {
      for (const key in raw.attr.aria)
        if (raw.attr.aria[key]) {
          raw.attr[key] = raw.attr.aria[key]; // override attr using aria
          delete raw.attr.aria[key];
        }
      if (Object.keys(raw.attr.aria).length < 1) delete raw.attr.aria;
    }
    if (Object.keys(raw.attr ?? {}).length > 0)
      for (const key in raw.attr) {
        if (!raw.attr[key]) continue;

        const overrideKey = raw[key] ? `aria-${key}` : key;
        raw[overrideKey] = raw.attr[key];
        delete raw.attr[key];
      }
    if (Object.keys(raw.attr ?? {}).length < 1) delete raw.attr;

    if (raw.inView === 'unknown') delete raw.inView;
    if (!hideBoundingBoxes) {
      if (this.boundingBox === 'none') delete raw.boundingBox;
      else raw.boundingBox = this.boundingBox;
    } else delete raw.boundingBox;

    const children = this.children.map((i) =>
      maxDepth === 0 ? { id: i.iNodeId } : i.toTree({ ...config, maxDepth: nextDepth }),
    );
    if (children.length < 1) delete raw.children;
    else raw.children = children;

    if (config?.ignoreFields) for (const field of config.ignoreFields) delete raw[field];
    return returnTruncatedTree(raw);
  }

  public removeChildId(childId: INodeId): void {
    const index = this.childIds.indexOf(childId);
    if (index < 0) return;
    this.#data.childIds.splice(index, 1);
  }

  public replaceChildId(oldId: INodeId, newId: INodeId): void {
    const index = this.childIds.indexOf(oldId);
    if (index < 0) throw new Error('Child not found. id=' + oldId);
    this.#data.childIds[index] = newId;
  }

  public setChildIds(childIds: INodeId[]): void {
    this.#data.childIds = childIds.map((i) => i);
  }

  public replaceParentId(newParentId: INodeId): void {
    this.#data.parentId = newParentId;
  }

  // ================================================================================================================
  // Private Instance
  // ================================================================================================================

  readonly #data: IInteractable.NodeData;
  readonly #dict: Record<INodeId, IInteractable.Node>; // remove this
  readonly #dom: IInteractable.Dom;
  #overriddenName: object | null = null;

  #prettifyToObject(raw: object): object {
    const obj = { ...raw };

    if ('id' in obj) obj.id = this.iNodeId;
    if ('parentId' in obj) obj.parentId = this.parentId ?? undefined;
    if ('childIds' in obj) obj.childIds = this.childIds;
    if ('type' in obj) obj.type = this.typeString;

    return obj;
  }

  #overrideAttr(attr: object): void {
    this.#overriddenName = attr;
  }

  #truncateNodeAttributes(tree: object, maxAttributeTokens: number): InteractableObject.TreeNode {
    if (!tree) return tree;

    const rsp = {} as Record<string, unknown>;
    Object.entries(tree).forEach(([key, value]) => {
      if (key === 'children') {
        rsp[key] = value.map((i: object) => this.#truncateNodeAttributes(i, maxAttributeTokens));
        return;
      }
      if (!value || typeof value !== 'string') {
        rsp[key] = value;
        return;
      }

      const tokens = TokenizerUtils.encodeToTokens(value);
      if (tokens.length <= maxAttributeTokens) {
        rsp[key] = value;
        return;
      }

      const truncatedTokens = tokens.slice(0, maxAttributeTokens);
      const truncatedStr = TokenizerUtils.decodeFromTokens(truncatedTokens);
      const truncatedTokenCount = tokens.length - truncatedTokens.length;
      const v = truncatedStr + ` ...(${truncatedTokenCount} more tokens)`;
      rsp[key] = v;
    });
    return rsp as InteractableObject.TreeNode;
  }
}
