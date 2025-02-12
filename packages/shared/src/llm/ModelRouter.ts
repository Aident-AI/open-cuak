import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic/edge';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { isEnvValueSet } from '~shared/env/environment';
import { VllmServiceHost } from '~shared/llm/vllm/VllmServiceHost';
import { EnumUtils } from '~shared/utils/EnumUtils';

export enum LlmRouterModel {
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  GPT = 'gpt',
  VLLM = 'vllm',
  OPEN_AI = 'openai',
}

export enum ClaudeVariant {
  HAIKU_3_5 = 'anthropic.claude-3-5-haiku-20241022-v1:0',
  SONNET_3_5_AWS = 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  SONNET_3_5_GCP = 'claude-3-5-sonnet-v2@20241022',
}

export enum GeminiVariant {
  FLASH_1_5 = 'gemini-1.5-flash',
  PRO_1_5 = 'gemini-1.5-pro',
  FLASH_2_0 = 'gemini-2.0-flash-exp',
}

export enum GPTVariant {
  GPT_4O = 'gpt-4o',
}

export type RouterModelConfig = { model: LlmRouterModel; variant?: string };

export class ModelRouter {
  public static async genModel(config: RouterModelConfig): Promise<LanguageModel> {
    // TODO improve the model selection logic when building model configuration UI
    const usingOpenAI = isEnvValueSet(process.env.OPENAI_API_KEY);
    const usingAzure =
      isEnvValueSet(process.env.AZURE_OPENAI_INSTANCE_NAME) && isEnvValueSet(process.env.AZURE_OPENAI_KEY);
    if (!usingOpenAI && !usingAzure) {
      throw new Error(
        'OPENAI_API_KEY must be set if using OpenAI, or AZURE_OPENAI_INSTANCE_NAME and AZURE_OPENAI_KEY must be set if using Azure',
      );
    }

    let model = config.model;
    if (usingOpenAI) {
      model = LlmRouterModel.OPEN_AI;
    }
    if (usingAzure) {
      model = LlmRouterModel.GPT;
    }

    switch (model) {
      case LlmRouterModel.CLAUDE: {
        const modelName = EnumUtils.getEnumValue(ClaudeVariant, config.variant ?? '') ?? ClaudeVariant.SONNET_3_5_GCP;
        const provider =
          modelName === ClaudeVariant.SONNET_3_5_GCP
            ? createVertexAnthropic({
                // GCP has no quota for now. so this will not go through
                project: process.env.GCP_PROJECT,
                location: 'us-east5',
                googleCredentials: {
                  clientEmail: process.env.GCP_ACCESS_KEY_CLIENT_EMAIL ?? '',
                  privateKey: process.env.GCP_ACCESS_KEY_PRIVATE_KEY ?? '',
                  privateKeyId: process.env.GCP_ACCESS_KEY_CLIENT_ID,
                },
              })
            : createAmazonBedrock({
                region: process.env.AWS_BEDROCK_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              });
        return provider(modelName);
      }
      case LlmRouterModel.GEMINI: {
        const google = createGoogleGenerativeAI({
          apiKey: process.env.GCP_GEMINI_API_KEY,
        });
        const modelName = EnumUtils.getEnumValue(GeminiVariant, config.variant ?? '') ?? GeminiVariant.FLASH_2_0;
        return google(modelName);
      }
      case LlmRouterModel.GPT: {
        const resourceName = process.env.AZURE_OPENAI_INSTANCE_NAME;
        const apiKey = process.env.AZURE_OPENAI_KEY;
        if (!resourceName || !apiKey) throw new Error('AZURE_OPENAI_INSTANCE_NAME and AZURE_OPENAI_KEY must be set');

        // The default value is 2024-10-01-preview, but all our deployments are 2024-08-01-preview
        const apiVersion = '2024-08-01-preview';
        const azure = createAzure({ resourceName, apiKey, apiVersion });
        return azure(process.env.AZURE_OPENAI_DEPLOYMENT ?? '');
      }
      case LlmRouterModel.VLLM: {
        return VllmServiceHost.getCreateOpenAILanguageModel();
      }
      case LlmRouterModel.OPEN_AI: {
        const openAiProvider = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        return openAiProvider.languageModel(process.env.OPENAI_MODEL_NAME ?? 'gpt-4o-2024-11-20');
      }
      default:
        throw new Error('Unknown model: ' + config.model);
    }
  }

  public static isClaude(model: LanguageModel): boolean {
    return model.modelId.includes('claude-3-5');
  }
}
