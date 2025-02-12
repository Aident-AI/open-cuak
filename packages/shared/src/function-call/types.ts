import { z } from 'zod';

const jsonSchemaTypeSchema = z
  .object({
    type: z.literal('object'),
    properties: z.record(
      z.object({
        type: z.string().describe('The type of the parameter'),
        description: z.string().optional().describe('The description of the parameter'),
      }),
    ),
    required: z.array(z.string()).default([]).describe('The required parameters'),
  })
  .default({ type: 'object', properties: {}, required: [] })
  .describe('The parameters of the function to call');

export const FunctionCallParameterSchema = jsonSchemaTypeSchema.or(z.object({ anyOf: z.array(jsonSchemaTypeSchema) }));

export const FunctionCallSchema = z.object({
  name: z.string().describe('The name of the function to call'),
  description: z.string().optional().describe('The description of the function to call'),
  parameters: FunctionCallParameterSchema,
});
export type FunctionCall = z.infer<typeof FunctionCallSchema>;
