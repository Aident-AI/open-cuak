import { Session, User } from '@supabase/supabase-js';

export type SupabaseAuthTokens = { accessToken: string; refreshToken: string; name: string } | null;

export type SupabaseUserSession = { session: Session; user: User } | null;
