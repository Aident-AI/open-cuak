import { z } from 'zod';
import { ALoggerLevel } from '~shared/logging/ALoggerLevel';

export const LogLineSchema = z.object({
  createdAt: z.date().or(z.number()),
  requestId: z.string().optional(),
  level: z.nativeEnum(ALoggerLevel).optional(),
  message: z.any(),
  environment: z.string(),
});
export type LogLine = z.infer<typeof LogLineSchema>;
