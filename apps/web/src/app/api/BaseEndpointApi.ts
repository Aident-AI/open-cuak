import { tool as AiTool } from 'ai';
import { PathItemObject } from 'openapi3-ts/oas31';
import { ZodSchema, ZodUndefined, z } from 'zod';
import { ShareGPTTool } from '~shared/data/ShareGPTDataSchema';
import { FunctionCallParameterSchema, FunctionCallSchema } from '~shared/function-call/types';
import { ZodUtils } from '~shared/utils/ZodUtils';

// TODO: figure out why this cannot be place in `~shared`
export type FunctionCall = z.infer<typeof FunctionCallSchema>;

export type EndpointConfigType = {
  path: string;
  method: 'post' | 'get' | 'put' | 'delete';
  operationId: string;
  summary: string | undefined;
};

export abstract class BaseEndpointApi {
  public abstract readonly EndpointConfig: EndpointConfigType;
  public abstract readonly RequestSchema: { required: boolean; schema: ZodSchema };
  public abstract readonly ResponseSchema: ZodSchema;

  public abstract exec(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _args: z.infer<typeof this.RequestSchema.schema>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params?: Record<string, unknown>,
  ): Promise<z.infer<typeof this.ResponseSchema>> | z.infer<typeof this.ResponseSchema>;

  public async ToolCalling(input: object): Promise<string> {
    const request = this.RequestSchema.schema.parse(input);
    const response = await this.exec(request);
    return JSON.stringify(response);
  }

  public toAiTool() {
    return AiTool({
      description: this.EndpointConfig.summary,
      parameters: this.RequestSchema.schema,
      execute: this.ToolCalling.bind(this),
    });
  }

  public toShareGPTFormat(): ShareGPTTool {
    return {
      name: this.EndpointConfig.operationId,
      description: this.EndpointConfig.summary ?? '',
      parameters: FunctionCallParameterSchema.parse(ZodUtils.parseToJsonSchema(this.RequestSchema.schema)),
    };
  }

  public get OpenApiPathSchema(): PathItemObject {
    const { method, operationId, summary } = this.EndpointConfig;
    const requestBody =
      this.RequestSchema.schema instanceof ZodUndefined
        ? undefined
        : {
            required: this.RequestSchema.required,
            content: {
              'application/json': {
                schema: ZodUtils.parseToJsonSchema(this.RequestSchema.schema),
              },
            },
          };
    return {
      [method]: {
        tags: [this.#camelize(operationId).split('_').slice(0, -1).join(':')],
        operationId: this.#camelize(operationId),
        summary,
        requestBody,
        responses: {
          // TODO: add more error response handling
          200: {
            description: 'OK',
            content: { 'application/json': { schema: ZodUtils.parseToJsonSchema(this.ResponseSchema) } },
          },
        },
      },
    };
  }

  public get FunctionCallSchema(): FunctionCall {
    const { operationId, summary } = this.EndpointConfig;
    const schema = FunctionCallSchema.parse({ name: this.#camelize(operationId), description: summary });
    if (this.RequestSchema.schema instanceof ZodUndefined) return schema;
    return {
      ...schema,
      parameters: FunctionCallParameterSchema.parse(ZodUtils.parseToJsonSchema(this.RequestSchema.schema)),
    };
  }

  #camelize(str: string): string {
    return str
      .split(':')
      .map((part) =>
        part
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(''),
      )
      .join('_');
  }
}
