import { z } from 'zod';

export const InteractableRefreshedValueSchema = z.object({
  updatedAt: z.number(),
  uuid: z.string().uuid(),
});

export type InteractableRefreshedValue = z.infer<typeof InteractableRefreshedValueSchema>;
