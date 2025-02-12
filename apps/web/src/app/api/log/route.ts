import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { isDevelopment } from '~shared/env/environment';
import { X_REQUEST_ID_HEADER } from '~shared/http/headers';
import { ALogger } from '~shared/logging/ALogger';
import { ALoggerLevel } from '~shared/logging/ALoggerLevel';
import { AwsCloudWatchLogs } from '~shared/logging/AwsCloudWatchLogs';
import { LogLineSchema } from '~shared/logging/LogLine';
import { getRequestContext } from '~src/_logging/RequestContext';
import { apiAsyncProcess } from '~src/app/api/apiAsyncProcess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = LogLineSchema.or(z.array(LogLineSchema));

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const requestId = req.headers.get(X_REQUEST_ID_HEADER) ?? getRequestContext()?.requestId;
    await ALogger.genInit(requestId, ExecutionEnvironment.WEB_API);

    void apiAsyncProcess(
      async () => {
        try {
          const text = await req.text();
          if (!text || text.length < 1) {
            ALogger.error({ api: 'api/log', context: 'Invalid request body', text });
            return;
          }

          const isLocal = req.url?.includes('http://localhost:3000/api/log');
          if (!isLocal) ALogger.debug({ context: 'api/log', requestUrl: req.url, requestBody: text });
          const body = JSON.parse(text);
          const request = requestSchema.parse(body);
          const lines = Array.isArray(request) ? request : [request];
          if (lines.length < 1) return;

          lines.forEach(async (line) => {
            const level = line.level ?? ALoggerLevel.INFO;
            const logLine = { ...line, level, buildEnv: process.env.NEXT_PUBLIC_BUILD_ENV };
            await AwsCloudWatchLogs.log(line.environment, logLine);
          });
        } catch (error) {
          ALogger.error({ api: 'api/log', context: 'Failed to parse request body.', error });
        } finally {
          if (!isDevelopment()) await ALogger.close();
        }
      },
      { requestId, silence: true },
    );
  } catch (error) {
    ALogger.error({ api: 'api/log', context: 'Failed to handle request.', error });
  } finally {
    if (!isDevelopment()) await ALogger.close();
  }
  return new NextResponse(JSON.stringify({ success: true }));
};
