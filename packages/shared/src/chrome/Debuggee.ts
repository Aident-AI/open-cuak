import { z } from 'zod';

export const DebuggeeSchema = z.object({ tabId: z.number() });
export type Debuggee = z.infer<typeof DebuggeeSchema>;

export const DebuggerCommandSchema = z.object({
  method: z.string(),
  debuggee: DebuggeeSchema.optional(),
  params: z.any().optional(),
});
export type DebuggerCommand = z.infer<typeof DebuggerCommandSchema>;

export const DEBUGGER_VERSION = '1.3';
