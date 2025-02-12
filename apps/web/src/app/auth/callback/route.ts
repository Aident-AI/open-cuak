import { NextResponse } from 'next/server';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const targetPath = requestUrl.searchParams.get('target') ?? '/';
  const finalRedirect = requestUrl.searchParams.get('final_redirect') ?? '/';

  if (code) {
    const supabase = SupabaseClientForServer.createForRouteHandler();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  const redirectUrl = targetPath ? requestUrl.origin + targetPath : finalRedirect;
  return NextResponse.redirect(redirectUrl);
}
