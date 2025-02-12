import { oneLine } from 'common-tags';
import { z } from 'zod';

export const IncludeTreeAfterwards = {
  includeTreeAfterwards: z.boolean().optional().default(false).describe(oneLine`
    Whether to include the interactable tree for the page after the interaction in the response. Defaulting to false.
  `),
};

export const SimplifiedTreeResponse = {
  tree: z.any().optional().describe(`The Interactable node tree of the page after the interaction.`),
};

export const TargetNodeIdSchema = z.string().default('').describe(oneLine`
  Node Id of the target to interact with. Must be a valid Interactable Node Id. Default to an empty string (i.e. '') for page root.
`);
