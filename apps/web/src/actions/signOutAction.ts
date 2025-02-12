'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

export async function signOutAction(from?: string) {
  const supabase = await SupabaseClientForServer.createForServerAction();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('no session');

  await supabase.auth.signOut();
  if (from) {
    revalidatePath(from);
  } else {
    redirect('/login');
  }
}
