import { StructuredToolInterface, tool } from '@langchain/core/tools';
import { z } from 'zod';
import { RegisteredToolSetName } from '~shared/agent/RegisteredToolSetName';
import { ExtensionApiSpec } from '~src/app/api/extension/ExtensionApiSpec';
import { VisionBasedBrowserControlApiSpec } from '~src/app/api/extension/VisionBasedBrowserControlApiSpec';

export const RegisteredToolSet: Record<RegisteredToolSetName, StructuredToolInterface[]> = {
  [RegisteredToolSetName.BROWSER_INTERACTION]: new ExtensionApiSpec().getFunctionCallDefinition().tools,
  [RegisteredToolSetName.BROWSER_INTERACTION_OPENAI_COMPATIBLE]: new ExtensionApiSpec().getFunctionCallDefinition({
    openaiCompatible: true,
  }).tools,
  [RegisteredToolSetName.BROWSER_CONTROL_VISION_BASED]:
    new VisionBasedBrowserControlApiSpec().getFunctionCallDefinition().tools,
  [RegisteredToolSetName.BROWSER_CONTROL_VISION_BASED_OPENAI_COMPATIBLE]:
    new VisionBasedBrowserControlApiSpec().getFunctionCallDefinition({
      openaiCompatible: true,
    }).tools,
  [RegisteredToolSetName.WORD_COUNT]: [
    tool(async ({ input }) => input.length.toString(), {
      name: 'get_word_length',
      description: 'Returns the length of a word.',
      schema: z.object({ input: z.string() }),
    }),
  ],
  [RegisteredToolSetName.PORTAL_BROWSER_CONTROL]: [],
};
