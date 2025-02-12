'use server';

import { Session, User } from '@supabase/supabase-js';
import { MockSupabaseUser } from '~shared/supabase/MockSupabaseUser';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

export async function signInAsGuest(): Promise<{ user: User; session: Session }> {
  const supabase = await SupabaseClientForServer.createForServerAction();
  const rsp = await MockSupabaseUser.genLoginMockUser(supabase);
  if (!rsp.session || !rsp.user) throw new Error('failed to login as guest');
  return rsp;
}
