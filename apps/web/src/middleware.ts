import { CookieOptions, createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDockerFriendlyUrl } from '~shared/env/environment';
import { X_REQUEST_ID_HEADER } from '~shared/http/headers';

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get(X_REQUEST_ID_HEADER) || uuid();
  request.headers.set(X_REQUEST_ID_HEADER, requestId);

  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    getDockerFriendlyUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );
  const { data } = await supabase.auth.getSession();

  const reqUrl = request.nextUrl;
  if (data.session) {
    if (reqUrl.pathname.startsWith('/login')) {
      const target = reqUrl.searchParams.get('target');
      const url = target || '/';
      return NextResponse.redirect(new URL(url, reqUrl));
    }
    return response;
  }

  // handle unauthorized users
  const pathRequiresAuth = ['/dev', '/companion', '/portal'];
  const requireAuth = pathRequiresAuth.some((path) => reqUrl.pathname.startsWith(path));
  if (requireAuth) {
    const url = reqUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('target', reqUrl.pathname ?? '');
    return NextResponse.redirect(url);
  }
  return response;
}
