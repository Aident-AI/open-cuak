import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodUndefined } from 'zod';
import { ALogger } from '~shared/logging/ALogger';
import { NextApiHandler, withRequestLogging } from '~src/_logging/withRequestLogging';
import { BaseEndpointApi } from '~src/app/api/BaseEndpointApi';
import { SimpleRequestWrapperConfig } from '~src/app/api/simpleRequestWrapper';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export interface BaseExtensionApiRouteConfig {
  assertUserLoggedIn?: boolean;
  params?: Record<string, unknown>;
}

export const BaseExtensionApiRouteWrapper = (
  getApi: (action?: string) => BaseEndpointApi,
  config: SimpleRequestWrapperConfig,
): NextApiHandler =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withRequestLogging(async (req: NextRequest, routes: any): Promise<NextResponse> => {
    const action = routes?.params?.action;
    const api = getApi(action);
    if (!api) throw new Error('No API found for action: ' + action);
    return BaseExtensionApiRouteInner(req, api, config);
  });

export async function BaseExtensionApiRouteInner(
  req: NextRequest,
  api: BaseEndpointApi,
  config: BaseExtensionApiRouteConfig = {},
): Promise<NextResponse> {
  const requestSchema: ZodSchema = api.RequestSchema.schema;
  const q = requestSchema instanceof ZodUndefined ? undefined : await req.json();
  let body;
  try {
    body = requestSchema.parse(q);
    ALogger.debug({ context: 'BaseEndpointApiRouteInner', requestUrl: req.url, requestBody: body });
  } catch (error) {
    ALogger.error({ context: 'Failed to parse request body.', error });
    return new NextResponse(JSON.stringify({ message: 'Invalid request body.', error }), {
      status: 400,
    });
  }

  try {
    // TODO: remove when we can throw errors with http status codes (handled by `fetchUserOrThrow`)
    if (config.assertUserLoggedIn) {
      const user = await ApiRequestContextService.getContext().fetchUser();
      if (!user) return new NextResponse(JSON.stringify({ message: 'User not logged in.' }), { status: 401 });
    }

    const result = await api.exec(body, config.params);
    return NextResponse.json(result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    ALogger.error({ context: 'Failed to execute request.', error });
    const err = { message: 'Failed to execute request.', error: error?.message };
    return new NextResponse(JSON.stringify(err), { status: 500 });
  }
}
