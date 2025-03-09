import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { LlmRouterModel } from '~shared/llm/LlmRouterModel';

export enum BoundingBoxGenerator {
  JS = 'js',
  OMNI_PARSER = 'omniparser',
}

export enum ClaudeHostingProvider {
  ANTHROPIC = 'anthropic',
  AWS = 'aws',
  GCP = 'gcp',
}

export const SERVICE_ROLE_USER_ID = '00000000-0000-0000-0000-000000000000';

export const UserConfigDataSchema = z.object({
  // Basic settings
  autoSaveAndApplyCookies: z.boolean().optional().default(false),
  boundingBoxGenerator: z.nativeEnum(BoundingBoxGenerator).optional().default(BoundingBoxGenerator.JS),
  omniparserHost: z.string().optional(),

  // LLM model selection
  llmModel: z.nativeEnum(LlmRouterModel).optional().default(LlmRouterModel.OPEN_AI),
  llmModelVariant: z.string().optional(),
  // access keys
  llmAwsAccessKeyId: z.string().optional(),
  llmAwsBedrockRegion: z.string().optional(),
  llmAwsSecretAccessKey: z.string().optional(),
  llmAzureApiVersion: z.string().optional(),
  llmAzureOpenaiDeployment: z.string().optional(),
  llmAzureOpenaiInstanceName: z.string().optional(),
  llmAzureOpenaiKey: z.string().optional(),
  llmClaudeAnthropicApiKey: z.string().optional(),
  llmClaudeAnthropicModelName: z.string().optional(),
  llmClaudeAwsAccessKeyId: z.string().optional(),
  llmClaudeAwsBedrockRegion: z.string().optional(),
  llmClaudeAwsModelName: z.string().optional(),
  llmClaudeAwsSecretAccessKey: z.string().optional(),
  llmClaudeGcpClientEmail: z.string().optional(),
  llmClaudeGcpClientId: z.string().optional(),
  llmClaudeGcpModelName: z.string().optional(),
  llmClaudeGcpPrivateKey: z.string().optional(),
  llmClaudeGcpProject: z.string().optional(),
  llmClaudeGcpRegion: z.string().optional(),
  llmClaudeProvider: z.nativeEnum(ClaudeHostingProvider).optional(),
  llmGcpClientEmail: z.string().optional(),
  llmGcpClientId: z.string().optional(),
  llmGcpPrivateKey: z.string().optional(),
  llmGcpProject: z.string().optional(),
  llmGeminiApiKey: z.string().optional(),
  llmGeminiModelName: z.string().optional(),
  llmOpenaiCompatibleApiKey: z.string().optional(),
  llmOpenaiCompatibleApiName: z.string().optional(),
  llmOpenaiCompatibleBaseUrl: z.string().optional(),
  llmOpenaiCompatibleModelName: z.string().optional(),
  llmOpenaiModelApiKey: z.string().optional(),
  llmOpenaiModelName: z.string().optional(),
  llmVllmServiceHost: z.string().optional(),
});
export type UserConfigData = z.infer<typeof UserConfigDataSchema>;

export const DefaultUserConfigData: UserConfigData = {
  autoSaveAndApplyCookies: false,
  boundingBoxGenerator: BoundingBoxGenerator.JS,
  llmModel: LlmRouterModel.OPEN_AI,
  llmClaudeProvider: ClaudeHostingProvider.GCP,
};

export class UserConfig {
  public static async genFetch(userId: string, supabase: SupabaseClient): Promise<UserConfigData> {
    // Special case for service role - return default config without DB query
    if (userId === SERVICE_ROLE_USER_ID) return DefaultUserConfigData;

    const { data, error } = await supabase.from('user_configs').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!data?.config) return DefaultUserConfigData;
    return UserConfigDataSchema.parse(data.config);
  }

  public static async genUpsert(userId: string, config: UserConfigData, supabase: SupabaseClient): Promise<void> {
    const { error } = await supabase
      .from('user_configs')
      .upsert({ user_id: userId, config }, { onConflict: 'user_id' });
    if (error) throw error;
  }
}
