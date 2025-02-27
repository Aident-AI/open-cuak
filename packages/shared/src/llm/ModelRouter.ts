import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic/edge';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { isEnvValueSet } from '~shared/env/environment';
import { VllmServiceHost } from '~shared/llm/vllm/VllmServiceHost';
import { UserConfigData } from '~shared/user-config/UserConfig';
import { EnumUtils } from '~shared/utils/EnumUtils';

export enum LlmRouterModel {
  AZURE_OAI = 'azure-oai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  OPEN_AI = 'openai',
  OPEN_AI_COMPATIBLE = 'openai-compatible',
  VLLM = 'vllm',
}

export const LlmRouterModelHumanReadableName: Record<LlmRouterModel, string> = {
  [LlmRouterModel.AZURE_OAI]: 'Azure OpenAI',
  [LlmRouterModel.CLAUDE]: 'Claude',
  [LlmRouterModel.GEMINI]: 'Gemini',
  [LlmRouterModel.OPEN_AI]: 'OpenAI',
  [LlmRouterModel.OPEN_AI_COMPATIBLE]: 'OpenAI API Compatible',
  [LlmRouterModel.VLLM]: 'VLLM',
};

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

export type RouterModelConfig = { model?: LlmRouterModel; variant?: string };

const DEFAULT_OPENAI_BASE_URL_PREFIX = 'https://api.openai.com';

export class ModelRouter {
  public static getModelFromUserConfigOrThrow(userConfig: UserConfigData): LanguageModel {
    if (!this.userConfigHasValidModel(userConfig)) {
      const llmModel = userConfig.llmModel ? `\`${userConfig.llmModel}\`` : '';
      throw new Error(`Model config ${llmModel} is invalid. Please configure your model in Configurations.`);
    }

    switch (userConfig.llmModel) {
      case LlmRouterModel.AZURE_OAI: {
        const apiVersion = userConfig.llmAzureApiVersion ?? '2024-08-01-preview';
        const resourceName = userConfig.llmAzureOpenaiInstanceName;
        const apiKey = userConfig.llmAzureOpenaiKey;
        const deploymentName = userConfig.llmAzureOpenaiDeployment!;

        const azure = createAzure({ resourceName, apiKey, apiVersion });
        return azure(deploymentName);
      }
      case LlmRouterModel.OPEN_AI: {
        const openAiProvider = createOpenAI({ apiKey: userConfig.llmOpenaiModelApiKey });
        const modelName = userConfig.llmOpenaiModelName ?? 'gpt-4o-2024-11-20';
        return openAiProvider.languageModel(modelName);
      }
      case LlmRouterModel.OPEN_AI_COMPATIBLE: {
        if (!userConfig.llmOpenaiCompatibleApiKey) throw new Error('OpenAI compatible API Key is not set.');
        if (!userConfig.llmOpenaiCompatibleBaseUrl) throw new Error('OpenAI compatible Base URL is not set.');
        if (!userConfig.llmOpenaiCompatibleModelName) throw new Error('OpenAI compatible model name is not set.');

        const apiKey = userConfig.llmOpenaiCompatibleApiKey;
        const baseURL = userConfig.llmOpenaiCompatibleBaseUrl;
        const name = userConfig.llmOpenaiCompatibleApiName ?? 'openai-compatible';
        const modelName = userConfig.llmOpenaiCompatibleModelName;

        const openAiProvider = createOpenAI({ baseURL, apiKey, compatibility: 'compatible', name });
        return openAiProvider.languageModel(modelName);
      }

      // TODO: add support for the following models
      case LlmRouterModel.GEMINI: {
        const google = createGoogleGenerativeAI({ apiKey: userConfig.llmGeminiApiKey });
        const modelName = userConfig.llmGeminiModelName ?? 'gemini-2.0-flash-exp';
        return google(modelName);
      }
      case LlmRouterModel.CLAUDE:
      case LlmRouterModel.VLLM: {
        throw new Error('VLLM is not supported yet.');
      }
      default:
        throw new Error('Unknown model: ' + userConfig.llmModel);
    }
  }

  public static userConfigHasValidModel(config: UserConfigData): boolean {
    switch (config.llmModel) {
      case LlmRouterModel.AZURE_OAI: {
        return !!(config.llmAzureOpenaiInstanceName && config.llmAzureOpenaiKey && config.llmAzureOpenaiDeployment);
      }
      case LlmRouterModel.OPEN_AI: {
        return !!config.llmOpenaiModelApiKey;
      }
      case LlmRouterModel.OPEN_AI_COMPATIBLE: {
        return !!(
          config.llmOpenaiCompatibleApiKey &&
          config.llmOpenaiCompatibleBaseUrl &&
          config.llmOpenaiCompatibleModelName
        );
      }

      // TODO: add support for the following models
      case LlmRouterModel.CLAUDE: {
        // Check if using GCP or AWS based on variant
        const isGcpVariant = config.llmModelVariant?.includes('GCP');
        const isAwsVariant = config.llmModelVariant?.includes('BEDROCK');

        if (isGcpVariant) {
          return !!(config.llmGcpProject && config.llmGcpClientEmail && config.llmGcpPrivateKey);
        } else if (isAwsVariant) {
          return !!(config.llmAwsBedrockRegion && config.llmAwsAccessKeyId && config.llmAwsSecretAccessKey);
        }
        return false;
      }
      case LlmRouterModel.GEMINI: {
        return !!config.llmGeminiApiKey;
      }
      case LlmRouterModel.VLLM: {
        return !!config.llmVllmServiceHost;
      }
      default: {
        return false;
      }
    }
  }

  public static async genModel(config: RouterModelConfig, userConfig?: UserConfigData): Promise<LanguageModel> {
    // TODO improve the model selection logic when building model configuration UI
    const usingOpenAI = isEnvValueSet(process.env.OPENAI_API_KEY);
    const usingAzure =
      isEnvValueSet(process.env.AZURE_OPENAI_INSTANCE_NAME) && isEnvValueSet(process.env.AZURE_OPENAI_KEY);
    if (!usingOpenAI && !usingAzure) {
      throw new Error(
        'OPENAI_API_KEY must be set if using OpenAI, or AZURE_OPENAI_INSTANCE_NAME and AZURE_OPENAI_KEY must be set if using Azure',
      );
    }
    const usingOpenAICompatible =
      isEnvValueSet(process.env.OPENAI_BASE_URL) &&
      process.env.OPENAI_BASE_URL?.startsWith(DEFAULT_OPENAI_BASE_URL_PREFIX);

    // Only override user selection if no model is specified
    if (!config.model) {
      if (usingOpenAI) config.model = LlmRouterModel.OPEN_AI;
      if (usingAzure) config.model = LlmRouterModel.AZURE_OAI;
      if (usingOpenAICompatible) config.model = LlmRouterModel.OPEN_AI_COMPATIBLE;
    }

    switch (config.model) {
      case LlmRouterModel.CLAUDE: {
        const modelName = EnumUtils.getEnumValue(ClaudeVariant, config.variant ?? '') ?? ClaudeVariant.SONNET_3_5_GCP;
        const provider =
          modelName === ClaudeVariant.SONNET_3_5_GCP
            ? createVertexAnthropic({
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
      case LlmRouterModel.AZURE_OAI: {
        const resourceName = userConfig?.llmAzureOpenaiInstanceName || process.env.AZURE_OPENAI_INSTANCE_NAME;
        const apiKey = userConfig?.llmAzureOpenaiKey || process.env.AZURE_OPENAI_KEY;
        if (!resourceName || !apiKey) throw new Error('Azure OpenAI Instance Name and Key must be set');

        // Use user-configured API version or fall back to default
        const apiVersion = userConfig?.llmAzureApiVersion || '2024-08-01-preview';
        const azure = createAzure({ resourceName, apiKey, apiVersion });

        // Use user-specified deployment if available, otherwise fall back to env var
        const deploymentName =
          config.variant || userConfig?.llmAzureOpenaiDeployment || process.env.AZURE_OPENAI_DEPLOYMENT || '';
        return azure(deploymentName);
      }
      case LlmRouterModel.VLLM: {
        return VllmServiceHost.getCreateOpenAILanguageModel();
      }
      case LlmRouterModel.OPEN_AI: {
        const openAiProvider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const modelName = config.variant || process.env.OPENAI_MODEL_NAME || 'gpt-4o-2024-11-20';
        return openAiProvider.languageModel(modelName);
      }
      case LlmRouterModel.OPEN_AI_COMPATIBLE: {
        if (!process.env.OPENAI_BASE_URL) throw new Error('OPENAI_BASE_URL must be set for OpenAI compatible API');

        const baseURL = userConfig?.llmOpenaiCompatibleBaseUrl || process.env.OPENAI_BASE_URL;
        const apiKey = userConfig?.llmOpenaiCompatibleApiKey || process.env.OPENAI_API_KEY;
        const name =
          (userConfig?.llmOpenaiCompatibleApiName || process.env.OPENAI_COMPATIBLE_API_NAME) ?? 'openai-compatible';
        const openAiProvider = createOpenAI({ baseURL, apiKey, compatibility: 'compatible', name });
        const modelName =
          userConfig?.llmModelVariant || userConfig?.llmOpenaiCompatibleModelName || process.env.OPENAI_MODEL_NAME;
        if (!modelName) throw new Error('Model name must be specified for OpenAI compatible API');

        return openAiProvider.languageModel(modelName);
      }
      default:
        throw new Error('Unknown model: ' + config.model);
    }
  }

  public static isClaude(model: LanguageModel): boolean {
    return model.modelId.includes('claude-3-5');
  }
}
