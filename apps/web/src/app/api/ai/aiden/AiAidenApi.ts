import { z } from 'zod';
import { XYPositionSchema } from '~shared/cursor/types';
import { LlmRouterModel } from '~shared/llm/LlmRouterModel';
import { BaseEndpointApi, EndpointConfigType } from '~src/app/api/BaseEndpointApi';

export const AiAidenApiMessageAnnotationSchema = z.object({
  ts: z.number().describe('The timestamp of the message.'),
  cursorType: z.string().describe('The cursor type of the message.'),
  cursorPosition: XYPositionSchema.describe('The position of the cursor.'),
  beforeStateBase64: z
    .string()
    .describe('The base64 of the screenshot of the last step state when the step is called.'),
  stateWithBoundingBoxes: z
    .boolean()
    .optional()
    .describe('Whether the state screenshot contains bounding boxes of interactable components on the screen.'),
  stateDescription: z.string().optional().describe('The description of the image.'),
  interactableTree: z.string().optional().describe('The interactable tree of the current screen.'),
  boundingBoxCoordinates: z.string().optional().describe('Identifier and coordinates of bounding boxes'),
});
export type AiAidenApiMessageAnnotation = z.infer<typeof AiAidenApiMessageAnnotationSchema>;

export const AiAidenStreamErrorSchema = z.object({ type: z.literal('error'), error: z.string() });
export type AiAidenStreamError = z.infer<typeof AiAidenStreamErrorSchema>;
export const AiAidenStreamStateInfoSchema = z.object({
  type: z.literal('state-info'),
  annotation: AiAidenApiMessageAnnotationSchema,
});
export type AiAidenStreamStateInfo = z.infer<typeof AiAidenStreamStateInfoSchema>;
export const AiAidenStreamDataSchema = AiAidenStreamErrorSchema.or(AiAidenStreamStateInfoSchema);
export type AiAidenStreamData = z.infer<typeof AiAidenStreamDataSchema>;

export class AiAidenApi extends BaseEndpointApi {
  public readonly EndpointConfig = {
    path: '/api/ai/aiden',
    method: 'post',
    operationId: 'ai-aiden',
    summary: 'Make a request to Aiden as an agent for response.',
  } as const as EndpointConfigType;

  public readonly RequestSchema = {
    required: true,
    schema: z.object({
      model: z.nativeEnum(LlmRouterModel).optional().describe('The model to use.'),
      messages: z.array(z.any()).describe('The chat history so far.'), // TODO: be more specific for ai-sdk message schema
      maxSteps: z.number().optional().describe('The maximum number of steps to take.'),
      isBenchmark: z.boolean().optional().describe('Whether the request is for benchmark.'),
      sopId: z.string().optional().describe('The id of the SOP to execute.'),
    }),
  };

  public readonly ResponseSchema = z.object({});

  public override async exec(): Promise<z.infer<typeof this.ResponseSchema>> {
    throw new Error('Not implemented');
  }
}

export const StateInfoToolResponseSchema = z.object({
  images: z.array(z.string()).describe('The images to be shown in the response.'),
  prompt: z.string().describe('The prompt to be shown in the response.'),
});
export type StateInfoToolResponse = z.infer<typeof StateInfoToolResponseSchema>;
