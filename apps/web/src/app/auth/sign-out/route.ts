import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

export async function POST(request: NextRequest) {
  return await _handelSignOut(request);
}

export async function GET(request: NextRequest) {
  return await _handelSignOut(request);
}

const _handelSignOut = async (request: NextRequest) => {
  const supabase = SupabaseClientForServer.createForRouteHandler();

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  const targetPath = requestUrl.searchParams.get('target') || '/';

  return NextResponse.redirect(requestUrl.origin + targetPath, { status: 302 });
};
