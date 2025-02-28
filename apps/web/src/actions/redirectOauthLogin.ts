'use server';

import { cookies } from 'next/headers';
import { ReadonlyURLSearchParams, redirect } from 'next/navigation';
import { OPENAI_OAUTH_COOKIE, OpenaiOAuthCookie, OpenaiOAuthCookieSchema } from '~src/app/plugin/oauth/constants';
import { getGoogleOAuth2Client } from '~src/services/GoogleOAuth2Client';

export async function redirectOauthLogin(searchParams: ReadonlyURLSearchParams) {
  const params = {} as Record<string, string>;
  searchParams.forEach(([key, value]) => {
    if (value && value.length > 0) params[key] = value;
  });

  const { redirect_uri, response_type, scope, include_granted_scopes, state } = params;
  const cookieBlob = OpenaiOAuthCookieSchema.parse({ state, redirect_uri });
  cookies().set(OPENAI_OAUTH_COOKIE, JSON.stringify(cookieBlob as OpenaiOAuthCookie));
  const authorizationUrl = getGoogleOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    response_type: response_type || 'code',
    scope: scope?.length > 1 ? scope?.split('+') : ['email', 'profile'],
    include_granted_scopes: !include_granted_scopes ? true : include_granted_scopes === 'true',
    state: state,
    prompt: 'consent',
  });
  redirect(authorizationUrl);
}
