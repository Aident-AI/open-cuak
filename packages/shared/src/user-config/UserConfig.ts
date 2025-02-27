import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { LlmRouterModel } from '~shared/llm/ModelRouter';

export enum BoundingBoxGenerator {
  JS = 'js',
  OMNI_PARSER = 'omniparser',
}

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
  llmGcpClientEmail: z.string().optional(),
  llmGcpClientId: z.string().optional(),
  llmGcpPrivateKey: z.string().optional(),
  llmGcpProject: z.string().optional(),
  llmGeminiApiKey: z.string().optional(),
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
};

export class UserConfig {
  public static async genFetch(userId: string, supabase: SupabaseClient): Promise<UserConfigData> {
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
