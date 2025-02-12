'use client';

import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { getHost } from '~shared/env/environment';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import DefaultButton from '~src/app/extension/home/DefaultButton';
import { UserSessionContext } from '~src/contexts/UserSessionContext';
import { useExtensionService } from '~src/hooks/useExtensionService';

export default function GetStartedButton() {
  const { user } = useContext(UserSessionContext);
  const { sendRuntimeMessage } = useExtensionService();
  const router = useRouter();

  const buttonConfig = !user
    ? {
        text: 'Login',
        action: () =>
          sendRuntimeMessage({
            receiver: RuntimeMessageReceiver.SERVICE_WORKER,
            action: ServiceWorkerMessageAction.GO_LOGIN,
          }),
      }
    : {
        text: 'Get Started',
        action: () => router.push(getHost() + '/extension/chat'),
      };

  return (
    <DefaultButton className="bottom-16" onClick={buttonConfig.action}>
      {buttonConfig.text}
    </DefaultButton>
  );
}
