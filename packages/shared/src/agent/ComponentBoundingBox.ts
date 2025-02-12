import { z } from 'zod';

export const ComponentBoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type ComponentBoundingBox = z.infer<typeof ComponentBoundingBoxSchema>;
