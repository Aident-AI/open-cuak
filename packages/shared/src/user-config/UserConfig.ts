import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export enum BoundingBoxGenerator {
  JS = 'js',
  OMNI_PARSER = 'omniparser',
}

export const UserConfigDataSchema = z.object({
  autoSaveAndApplyCookies: z.boolean().optional().default(false),
  boundingBoxGenerator: z.nativeEnum(BoundingBoxGenerator).optional().default(BoundingBoxGenerator.JS),
  omniparserHost: z.string().optional(),
});
export type UserConfigData = z.infer<typeof UserConfigDataSchema>;

export const DefaultUserConfigData: UserConfigData = {
  autoSaveAndApplyCookies: false,
  boundingBoxGenerator: BoundingBoxGenerator.JS,
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
