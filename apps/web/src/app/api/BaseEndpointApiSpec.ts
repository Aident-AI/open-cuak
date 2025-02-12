import { tool } from '@langchain/core/tools';
import { CoreTool } from 'ai';
import { OpenAPIObject, PathItemObject } from 'openapi3-ts/oas31';
import { ShareGPTTool } from '~shared/data/ShareGPTDataSchema';
import { isDebuggingInProd } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { BaseEndpointApi } from '~src/app/api/BaseEndpointApi';

export abstract class BaseEndpointApiSpec {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static apiToFunctionCall(api: BaseEndpointApi, openaiCompatible: boolean = false) {
    return tool(
      async (input) => {
        ALogger.debug({ context: '🛠️  Using tool', tool: api.EndpointConfig.operationId, input });
        try {
          const response = await api.ToolCalling(input);
          ALogger.debug({ context: '✅ Received tool response', response });
          return response;
        } catch (e: unknown) {
          ALogger.error({ context: '❌ Failed to call api', error: e, tool: api.EndpointConfig.operationId, input });
          return 'Failed to call tool: ' + (e as Error).message;
        }
      },
      {
        name: openaiCompatible ? api.EndpointConfig.operationId.replaceAll(':', '_') : api.EndpointConfig.operationId,
        description: api.EndpointConfig.summary ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: api.RequestSchema.schema as any,
      },
    );
  }

  public abstract readonly apis: BaseEndpointApi[];
  public abstract readonly title: string;
  public abstract readonly version: string;
  public abstract readonly description: string;

  public get apiDefinition(): OpenAPIObject {
    const info = { title: this.title, version: this.version, description: this.description };
    const servers = [
      {
        url: isDebuggingInProd
          ? 'https://app.aident.ai/api/forwarder?url=http://ljhskyso.ddns.net'
          : (process.env.NEXT_PUBLIC_ORIGIN ?? ''),
      },
    ];
    const paths = this.apis.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc, api: any) => {
        const path = (isDebuggingInProd ? '' : '') + api.EndpointConfig.path;
        acc[path] = api.OpenApiPathSchema;
        return acc;
      },
      {} as Record<string, PathItemObject>,
    );
    const components = {
      schemas: {},
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: process.env.NEXT_PUBLIC_ORIGIN + '/plugin/oauth',
              tokenUrl: process.env.NEXT_PUBLIC_ORIGIN + '/plugin/oauth/exchange',
              scopes: { email: 'email', profile: 'profile' },
            },
          },
        },
      },
    } as OpenAPIObject['components'];
    return { openapi: '3.0.1', info, servers, paths, components, security: [] };
  }

  public get apiSpec() {
    return { apiFolder: 'src/app/api/extension', definition: this.apiDefinition };
  }

  public getFunctionCallDefinition(options?: { openaiCompatible?: boolean }) {
    return {
      info: this.apiDefinition.info,
      functions: this.apis.map((api) => api.FunctionCallSchema),
      tools: this.apis.map((api) => BaseEndpointApiSpec.apiToFunctionCall(api, options?.openaiCompatible)),
    };
  }

  public getAiToolDict(): Record<string, CoreTool> {
    const toolDict = {} as Record<string, CoreTool>;

    for (const api of this.apis) {
      const toolName = api.EndpointConfig.operationId.replaceAll(':', '-');
      const toolObject = api.toAiTool();
      toolDict[toolName] = toolObject;
    }

    return toolDict;
  }

  public getShareGPTFormat(): ShareGPTTool[] {
    return this.apis.map((api) => api.toShareGPTFormat());
  }
}
