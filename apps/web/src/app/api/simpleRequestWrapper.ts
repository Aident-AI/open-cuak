import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodUndefined } from 'zod';
import { isDevelopment } from '~shared/env/environment';
import { ApiRequestContext } from '~shared/http/ApiRequestContext';
import { X_SERVICE_ROLE_TOKEN_HEADER } from '~shared/http/headers';
import { ALogger } from '~shared/logging/ALogger';
import { ErrorTransformation } from '~shared/utils/ErrorTransformation';
import { NextApiHandler, withRequestLogging } from '~src/_logging/withRequestLogging';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export interface SimpleRequestWrapperConfig {
  allowServiceRole?: boolean;
  assertUserLoggedIn?: boolean;
  skipResponseParsing?: boolean;
}

export const simpleRequestWrapper = <T>(
  requestSchema: ZodSchema,
  config: SimpleRequestWrapperConfig,
  exec: (
    reqBody: T,
    context: ApiRequestContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    path?: any,
    signal?: AbortSignal,
  ) => Promise<NextResponse> | NextResponse | Response | Promise<Response>,
): NextApiHandler =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withRequestLogging(async (req: NextRequest, routes?: any) =>
    simpleRequestWrapperInner<T>(req, requestSchema, exec, config, routes),
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeBase64(obj: any): any {
  if (typeof obj === 'string') {
    const isBase64 = obj.startsWith('data:image/') && obj.includes('base64');
    return isBase64 ? '[skipped-base64]' : obj;
  } else if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeBase64(item));
  } else if (obj !== null && typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitizedObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeBase64(obj[key]);
      }
    }
    return sanitizedObj;
  }
  return obj;
}

// @deprecated use `BaseExtensionApiRoute` instead
export async function simpleRequestWrapperInner<T>(
  req: NextRequest,
  requestSchema: ZodSchema,
  exec: (
    reqBody: T,
    context: ApiRequestContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dynamicPath?: any,
    signal?: AbortSignal,
  ) => Promise<NextResponse> | NextResponse | Response | Promise<Response>,
  config: SimpleRequestWrapperConfig = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path?: any,
): Promise<NextResponse | Response> {
  let body;
  const headers = {} as Record<string, string>;
  try {
    const requestBody = await req.text();
    req.headers.forEach((value, key) => (headers[key] = value));
    const q = requestSchema instanceof ZodUndefined ? undefined : JSON.parse(requestBody);
    body = requestSchema.parse(q) as T;

    // override body for logging
    let loggingBody = body;
    if (req.url.includes('/utils/sharp')) {
      loggingBody = { ...body, backgroundBase64: '[skipped]' };
      if ('overlayBase64' in (loggingBody as object)) loggingBody = { ...loggingBody, overlayBase64: '[skipped]' };
    }
    if (req.url.includes('/utils/sharp-metadata')) loggingBody = { ...body, base64: '[skipped]' };
    loggingBody = sanitizeBase64(body);

    ALogger.info({ context: 'simpleRequestWrapper', requestUrl: req.url, requestBody: loggingBody });
  } catch (error) {
    const e = ErrorTransformation.convertErrorToObject(error as Error);
    ALogger.error({ stack: 'simpleRequestWrapper', context: 'Failed to parse request body.', error: e });
    return new NextResponse(JSON.stringify({ message: 'Invalid request body.', error }), {
      status: 400,
    });
  }

  try {
    const context = ApiRequestContextService.getContext();
    if (config.assertUserLoggedIn) {
      const user = await context.fetchUser();
      if (!user) {
        ALogger.error({
          stack: 'simpleRequestWrapperInner',
          context: 'User is null while assertUserLoggedIn set to be true',
        });
        return new NextResponse(JSON.stringify({ message: 'User not logged in.' }), { status: 401 });
      }
    }
    const serviceRoleToken = headers[X_SERVICE_ROLE_TOKEN_HEADER.toLowerCase()];
    if (serviceRoleToken && config.allowServiceRole) {
      if (!isDevelopment()) {
        if (serviceRoleToken !== process.env.SERVICE_ROLE_TOKEN) throw new Error('Invalid service role token.');
      }
      ApiRequestContextService.overrideSupabaseUsingServiceRole();
    }

    const response = await exec(body, context, path, req.signal);
    if (config.skipResponseParsing) return response;

    if (!(response instanceof NextResponse)) {
      const responseBody = await response.text();
      const newHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        newHeaders[key] = value;
      });
      return new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
    return response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const e = ErrorTransformation.convertErrorToObject(error as Error);
    ALogger.error({ context: 'Failed to execute request.', error: e });
    return new NextResponse(JSON.stringify({ message: 'Failed to execute request.', error: e }), {
      status: 500,
    });
  }
}
