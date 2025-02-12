import { handleBaseEndpointRequest } from '~src/app/api/handleBaseEndpointRequest';
import { WebVoyagerRunTaskApi } from '~src/app/api/web-voyager/run-task/WebVoyagerRunTaskApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs';

const api = new WebVoyagerRunTaskApi();
const config = { assertUserLoggedIn: false, useServiceRole: true, skipResponseParsing: false };

export const POST = handleBaseEndpointRequest(api, config);
