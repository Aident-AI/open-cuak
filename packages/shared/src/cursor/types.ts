import { z } from 'zod';

export const PaginationCursorSchema = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  nextCursor: z.string().uuid().optional(),
  hasPrev: z.boolean(),
  prevCursor: z.string().uuid().optional(),
  pageSizeByToken: z.number(),
  maxTokenPerPage: z.number(),
});
export type PaginationCursor = z.infer<typeof PaginationCursorSchema>;

export const XYPositionSchema = z.object({ x: z.number(), y: z.number() });
export type XYPosition = z.infer<typeof XYPositionSchema>;

export const WHSizeSchema = z.object({ width: z.number(), height: z.number() });
export type WHSize = z.infer<typeof WHSizeSchema>;
