import { NextRequest, NextResponse } from 'next/server';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { isDevelopment } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { ErrorTransformation } from '~shared/utils/ErrorTransformation';
import { RunningAsyncProcesses } from '~src/app/api/apiAsyncProcess';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export type DynamicRoutes = { params: { [key: string]: string } };
export type NextApiHandler = (
  req: NextRequest,
  dynamicRoutes?: DynamicRoutes,
) => NextResponse | Response | Promise<NextResponse | Response>;

export const withRequestLogging =
  (handler: NextApiHandler): NextApiHandler =>
  async (req: NextRequest, dynamicRoutes?: DynamicRoutes) => {
    // eslint-disable-next-line no-console
    console.debug('Start to initialize ALogger.');

    const context = ApiRequestContextService.initInRoutes(req);
    await ALogger.genInit(context.getRequestId(), ExecutionEnvironment.WEB_API);

    // eslint-disable-next-line no-console
    console.debug('ALogger initialized.');

    try {
      ALogger.info({ context: 'withRequestLogging', requestUrl: req.url, dynamicRoutes });
      return await handler(req, dynamicRoutes);
    } catch (error) {
      const e = ErrorTransformation.convertErrorToObject(error as Error);
      ALogger.error({ stack: 'withRequestLogging', context: 'Failed handle request for logging', error: e });
      return new NextResponse(JSON.stringify({ message: 'Invalid request body.', error: e }), { status: 500 });
    } finally {
      if (!isDevelopment() && !RunningAsyncProcesses.hasAsyncProcess()) await ALogger.close();
    }
  };
