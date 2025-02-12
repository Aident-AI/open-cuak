import { z } from 'zod';
import { InteractableNodeRole } from '~shared/interactable/InteractableNodeRole';

export const BoundingBoxSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })
  .or(z.literal('none'));
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export namespace InteractableObject {
  export const NodeSchema = z
    .object({
      id: z.string(),
      parentId: z.string().optional(),
      childIds: z.array(z.string()).optional(),

      role: z.nativeEnum(InteractableNodeRole).optional(),
      attr: z.record(z.any()).optional(),
      isMerged: z.boolean().optional(),
      isRoot: z.boolean().optional(),
      isLeaf: z.boolean().optional(),
      boundingBox: BoundingBoxSchema.optional(),
      inView: z.boolean().or(z.literal('unknown')).optional(),
    })
    .passthrough();

  export type Node = z.infer<typeof NodeSchema>;

  export const NodeDictSchema = z.record(z.string(), NodeSchema);
  export type NodeDict = z.infer<typeof NodeDictSchema>;

  export const TreeNodeSchema: z.ZodSchema<Node & { children?: TreeNode[] }> = NodeSchema.merge(
    z.object({
      parentId: z.undefined(),
      childIds: z.undefined(),
      children: z.lazy(() => z.array(TreeNodeSchema.or(z.object({ id: z.string() }))).optional()),
    }),
  );
  export type TreeNode = z.infer<typeof TreeNodeSchema>;
}
