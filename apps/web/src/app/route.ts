import { NextRequest, NextResponse } from 'next/server';
import { getHost } from '~shared/env/environment';

export async function GET(request: NextRequest) {
  // TODO: a hack to redirect to the auth callback url - fix this with proper supabase config for cloud.production env
  const url = new URL(request.url);
  if (url.searchParams.has('code')) {
    const authCallbackUrl = new URL('/auth/callback', request.url);
    url.searchParams.forEach((value, key) => authCallbackUrl.searchParams.set(key, value));
    if (!authCallbackUrl.host) authCallbackUrl.host = getHost();
    return NextResponse.redirect(authCallbackUrl);
  }

  const targetUrl = new URL('/portal', request.url);
  if (!targetUrl.host) targetUrl.host = getHost();
  return NextResponse.redirect(targetUrl);
}
