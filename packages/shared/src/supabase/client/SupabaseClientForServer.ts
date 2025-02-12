import { createServerClient } from '@supabase/ssr';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getDockerFriendlyUrl } from '~shared/env/environment';

import type { CookieOptions } from '@supabase/ssr';

// see supabase document @ https://supabase.com/docs/guides/auth/server-side/creating-a-client?environment=route-handler
export class SupabaseClientForServer {
  public static createForRouteHandler(): SupabaseClient {
    const cookieStore = cookies();
    const supabase = createServerClient(
      getDockerFriendlyUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      },
    );
    return supabase;
  }

  public static async createForServerAction(): Promise<SupabaseClient> {
    'use server';

    return this.createForRouteHandler();
  }

  public static async createForServerComponent(): Promise<SupabaseClient> {
    return this.createForServerAction();
  }

  public static createAnonymous(): SupabaseClient {
    return createClient(
      getDockerFriendlyUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  public static createServiceRole(): SupabaseClient {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error('Service key is not set');
    return createClient(getDockerFriendlyUrl(process.env.NEXT_PUBLIC_SUPABASE_URL), serviceKey);
  }
}
