import { CoreTool } from 'ai';
import { z } from 'zod';
import { ShareGPTTool, ShareGPTToolSchema } from '~shared/data/ShareGPTDataSchema';
import { ZodUtils } from '~shared/utils/ZodUtils';

export const AiToolCallSchema = z.object({
  name: z.string().describe('The name of the tool called.'),
  arguments: z.any().describe('The arguments passed to the tool.'),
});
export type AiToolCall = z.infer<typeof AiToolCallSchema>;

export const convertCoreToolToShareGPTTool = (toolName: string, tool: CoreTool): ShareGPTTool => {
  if (tool.type === 'provider-defined') throw new Error('Provider defined tools are supported yet.');
  const parameters = ZodUtils.parseToJsonSchema(tool.parameters);
  return ShareGPTToolSchema.parse({ name: toolName, description: tool.description, parameters });
};
