import { Session, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';
import { getGoogleOAuth2Client } from '~src/services/GoogleOAuth2Client';

export async function POST(req: NextRequest) {
  const context = ApiRequestContextService.initInRoutes(req);
  await ALogger.genInit(context.getRequestId(), ExecutionEnvironment.WEB_API);

  const body = await req.text();
  const q = _parseBodyContent(body);
  ALogger.info({ context: 'request body', body: q });
  const { code, refresh_token, grant_type } = q;

  const processError = (msg: string, statusCode: number = 500) => {
    ALogger.error(msg);
    return NextResponse.json({ error: msg }, { status: statusCode });
  };

  try {
    const supabase = SupabaseClientForServer.createForRouteHandler();
    let session: Session | undefined;

    if (grant_type === 'authorization_code') {
      if (!code || code.length < 1) return processError('Invalid code');
      session = await _exchangeAccessTokenFromCode(code, supabase);
    } else if (grant_type === 'refresh_token') {
      if (!refresh_token || refresh_token.length < 1) return processError('Invalid refresh_token');
      session = await _refreshSessionUsingRefreshToken(refresh_token, supabase);
    } else {
      return processError('Invalid grant_type');
    }
    if (!session) return processError('Failed to fetch session');

    const { access_token, token_type, refresh_token: newRefreshToken, expires_in } = session;
    return NextResponse.json({ access_token, token_type, refresh_token: newRefreshToken, expires_in });
  } catch (e) {
    return processError((e as Error).message);
  }
}

const _parseBodyContent = (body: string): Record<string, string> => {
  try {
    const json = JSON.parse(body);
    return json;
  } catch (error) {
    // If it fails, it might be URL search parameters
    try {
      const params = new URLSearchParams(body);
      if ([...params].length < 1) return {};

      const obj: { [key: string]: string } = {};
      params.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    } catch (e) {
      throw new Error('The input is neither JSON nor URL search parameters.');
    }
  }
};

const _exchangeAccessTokenFromCode = async (code: string, supabase: SupabaseClient): Promise<Session> => {
  const { tokens } = await getGoogleOAuth2Client().getToken(code);
  const { id_token: token, access_token } = tokens;
  if (!token) throw new Error('Missing id_token');
  if (!access_token) throw new Error('Missing access_token');

  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, access_token });
  if (error) throw new Error(error.message);
  if (!data || !data.session) throw new Error('Invalid credentials');

  return data.session;
};

const _refreshSessionUsingRefreshToken = async (refresh_token: string, supabase: SupabaseClient): Promise<Session> => {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) throw new Error(error.message);
  if (!data || !data.session) throw new Error('Invalid credentials');

  return data.session;
};
