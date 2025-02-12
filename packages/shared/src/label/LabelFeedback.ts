import { z } from 'zod';

export enum LabelFeedbackType {
  EDIT = 'edit',
  PENDING = 'pending',
  THUMB_DOWN = 'thumb_down',
  THUMB_UP = 'thumb_up',
}

export const LabelFeedbackSchema = z.object({
  type: z.nativeEnum(LabelFeedbackType),
  content: z.string().optional(),
});
export type LabelFeedback = z.infer<typeof LabelFeedbackSchema>;
