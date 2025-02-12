import { CoreTool, tool } from 'ai';
import { z } from 'zod';
import { RegisteredToolSetName } from '~shared/agent/RegisteredToolSetName';
import { ExtensionApiSpec } from '~src/app/api/extension/ExtensionApiSpec';
import { VisionBasedBrowserControlApiSpec } from '~src/app/api/extension/VisionBasedBrowserControlApiSpec';
import { PortalBrowserControlApiSpec } from '~src/app/api/portal/PortalBrowserControlApiSpec';

export const AiRegisteredToolSet: Record<RegisteredToolSetName, Record<string, CoreTool>> = {
  [RegisteredToolSetName.BROWSER_CONTROL_VISION_BASED]: new VisionBasedBrowserControlApiSpec().getAiToolDict(),
  [RegisteredToolSetName.BROWSER_INTERACTION]: new ExtensionApiSpec().getAiToolDict(),
  [RegisteredToolSetName.PORTAL_BROWSER_CONTROL]: new PortalBrowserControlApiSpec().getAiToolDict(),
  [RegisteredToolSetName.WORD_COUNT]: {
    ['get_word_length']: tool({
      description: 'Returns the length of a word.',
      parameters: z.object({ input: z.string() }),
      execute: async ({ input }) => input.length.toString(),
    }),
  },
  [RegisteredToolSetName.BROWSER_CONTROL_VISION_BASED_OPENAI_COMPATIBLE]: {},
  [RegisteredToolSetName.BROWSER_INTERACTION_OPENAI_COMPATIBLE]: {},
};
