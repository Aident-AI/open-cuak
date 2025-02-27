import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import PgBoss from 'pg-boss';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';
import { UserConfigData } from '~shared/user-config/UserConfig';

export interface ApiRequestContext {
  fetchSession: () => Promise<Session | null>;
  fetchUser: () => Promise<User | null>;
  fetchUserOrThrow: () => Promise<User>;
  fetchUserConfig: () => Promise<UserConfigData>;
  getBoss: () => PgBoss;
  /** @deprecated Use getRemoteBrowserSessionId instead */
  getExecSessionId: () => string | undefined;
  getRemoteBrowserSessionId: () => string | undefined;
  getRequestId: () => string;
  getSupabase: () => SupabaseClient;
  sendRuntimeMessage: (message: RuntimeMessage, targetChannel?: string) => Promise<RuntimeMessageResponse>;
}
