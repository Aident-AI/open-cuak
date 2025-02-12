import { headers } from 'next/headers';
import {
  X_EXEC_SESSION_ID_HEADER,
  X_REMOTE_BROWSER_SESSION_ID_HEADER,
  X_REQUEST_ID_HEADER,
} from '~shared/http/headers';
import { ALogger } from '~shared/logging/ALogger';

export interface RequestContext {
  execSessionId?: string;
  remoteBrowserSessionId?: string;
  requestId: string;
}

export const getRequestContext = (): RequestContext => {
  try {
    const headersList = headers();
    const requestId = headersList.get(X_REQUEST_ID_HEADER);
    if (!requestId) throw new Error('Request ID is not set.');
    const remoteBrowserHeaderValue = headersList.get(X_REMOTE_BROWSER_SESSION_ID_HEADER) ?? '';
    const remoteBrowserSessionId = remoteBrowserHeaderValue.length > 0 ? remoteBrowserHeaderValue : undefined;
    const execSessionId = headersList.get(X_EXEC_SESSION_ID_HEADER) ?? remoteBrowserSessionId ?? requestId;

    return { execSessionId, remoteBrowserSessionId, requestId };
  } catch (error) {
    ALogger.warn({ context: 'Failed to get request context', error });
    return { requestId: 'unknown', execSessionId: 'unknown' };
  }
};
