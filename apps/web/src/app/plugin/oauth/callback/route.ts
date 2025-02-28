import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ALogger } from '~shared/logging/ALogger';
import { OPENAI_OAUTH_COOKIE, OpenaiOAuthCookieSchema } from '~src/app/plugin/oauth/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieString = cookies().get(OPENAI_OAUTH_COOKIE)?.value;
  if (!cookieString) return NextResponse.json({ error: 'Missing cookie' }, { status: 400 });
  const parsingResult = OpenaiOAuthCookieSchema.safeParse(JSON.parse(cookieString));
  if (!parsingResult.success) return NextResponse.json({ error: 'Invalid cookie' }, { status: 400 });
  const cookie = parsingResult.data;

  const state = requestUrl.searchParams.get('state');
  if (state !== cookie.state) return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  const code = requestUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const redirectUri = cookie.redirect_uri || '/';
  if (!redirectUri) return NextResponse.json({ error: 'Missing redirect_uri' }, { status: 400 });
  const params = { state, code } as Record<string, string>;
  const paramsString = Object.keys(params)
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  ALogger.debug({ context: 'redirecting oauth callback', url: `${redirectUri}?${paramsString}` });
  return NextResponse.redirect(`${redirectUri}?${paramsString}`);
}
