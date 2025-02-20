import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export enum BoundingBoxGenerator {
  JS = 'js',
  OMNI_PARSER = 'omniparser',
}

export const UserConfigSchema = z.object({
  autoSaveAndApplyCookies: z.boolean().optional().default(false),
  boundingBoxGenerator: z.nativeEnum(BoundingBoxGenerator).optional().default(BoundingBoxGenerator.JS),
});

export type UserConfig = z.infer<typeof UserConfigSchema>;

export const defaultUserConfigData: UserConfig = {
  autoSaveAndApplyCookies: false,
  boundingBoxGenerator: BoundingBoxGenerator.JS,
};

export const genFetchUserConfig = async (userId: string, supabase: SupabaseClient): Promise<UserConfig> => {
  const { data, error } = await supabase.from('user_configs').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data?.config) return defaultUserConfigData;
  return UserConfigSchema.parse(data.config);
};

export const genSaveUserConfig = async (
  userId: string,
  config: UserConfig,
  supabase: SupabaseClient,
): Promise<void> => {
  const { error } = await supabase.from('user_configs').upsert({ user_id: userId, config }, { onConflict: 'user_id' });
  if (error) throw error;
};
