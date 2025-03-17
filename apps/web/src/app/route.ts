import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // TODO: a hack to redirect to the auth callback url - fix this with proper supabase config for cloud.production env
  const url = new URL(request.url);
  if (url.searchParams.has('code')) {
    const authCallbackUrl = new URL('/auth/callback', request.url);
    url.searchParams.forEach((value, key) => authCallbackUrl.searchParams.set(key, value));
    return NextResponse.redirect(authCallbackUrl);
  }

  return NextResponse.redirect(new URL('/portal', request.url));
}
