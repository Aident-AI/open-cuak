import { handleBaseEndpointRequest } from '~src/app/api/handleBaseEndpointRequest';
import { ReplayAssistantMessageApi } from '~src/app/api/portal/replay-assistant-message/ReplayAssistantMessageApi';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs';

const api = new ReplayAssistantMessageApi();
const config = { assertUserLoggedIn: true, skipResponseParsing: true };
export const POST = handleBaseEndpointRequest(api, config);
