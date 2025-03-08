'use client';

import { useMemo } from 'react';
import { getHost } from '~shared/env/environment';
import { X_REMOTE_BROWSER_SESSION_ID_HEADER } from '~shared/http/headers';
import { RuntimeMessage } from '~shared/messaging/types';

interface Props {
  remoteBrowserSessionId?: string;
}

export function useRemoteBrowserMessaging(props: Props) {
  const sendRuntimeMessage = useMemo(() => {
    return async <T>(message: RuntimeMessage, targetSessionId?: string) => {
      const targetChannel = targetSessionId || props.remoteBrowserSessionId;
      if (!targetChannel) throw new Error('execSessionId is required to send runtime message');

      const url = getHost() + '/api/extension/send-runtime-message';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [X_REMOTE_BROWSER_SESSION_ID_HEADER]: targetChannel },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error(`Failed to send runtime message: ${response.statusText}`);

      try {
        const data = await response.json();

        // Handle empty response
        if ((data === null || data === undefined) && response.ok) {
          return undefined as unknown as T;
        }

        return data as T;
      } catch (error) {
        // Handle intentional void response
        if (response.ok) {
          return undefined as unknown as T;
        }

        throw new Error('Failed to parse response');
      }
    };
  }, [props.remoteBrowserSessionId]);

  return { sendRuntimeMessage };
}
