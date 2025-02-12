export class TreeTransformation {
  public static listToTree<T>(list: T[], rootId: string): T {
    const dict = {} as Record<string, any>;
    list.forEach((node: any) => (dict[node.id] = node));
    const root = dict[rootId];
    if (!root) throw new Error(`No node found with id ${rootId}`);
    return TreeTransformation.dictToTree(dict, rootId);
  }

  public static dictToTree<T>(record: Record<string, any>, rootId: string): T {
    const root = { ...record[rootId] };
    if (!root) throw new Error(`No node found with id ${rootId}`);

    const childIds = root.childIds;
    delete root.childIds;
    delete root.parentId;
    if (!childIds || childIds.length === 0) return root;

    const children = childIds.map((id: string) => TreeTransformation.dictToTree(record, id)) as T[];
    return { ...root, children } as T;
  }

  public static mapToDict(map: Map<string, any>) {
    const record: Record<string, any> = {};
    map.forEach((value, key) => (record[key] = value));
    return record;
  }

  public static mapToTree(map: Map<string, any>, rootId: string) {
    const root = map.get(rootId);
    if (!root.childIds || root.childIds.length === 0) return root;
    return { ...root, children: root.childIds.map((id: string) => TreeTransformation.mapToTree(map, id)) };
  }
}
