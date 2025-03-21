'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import AidentLogo from '~assets/aident-logo-white.svg';
import { getHost } from '~shared/env/environment';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { ServiceWorkerMessage } from '~shared/messaging/service-worker/types';
import { useExtensionService } from '~src/hooks/useExtensionService';

export default function CompanionFAB() {
  const router = useRouter();
  const { sendRuntimeMessage } = useExtensionService();

  const onClick = async () => {
    const chatgptTabId = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.GET_CHATGPT_TAB_ID,
    } as ServiceWorkerMessage);
    if (!chatgptTabId) throw new Error('ChatGPT tab not found');
    router.push(getHost() + '/extension/box');
  };

  return (
    <button
      // TODO: fix eslint and prettier conflict
      // eslint-disable-next-line
      className="flex h-8 w-8 items-center justify-center rounded-full bg-black hover:shadow-inner-light hover:shadow-blue-600"
      data-iframe-height="2rem"
      data-iframe-width="2rem"
      onClick={onClick}
    >
      <Image priority className="h-6 w-6" src={AidentLogo} alt="Aident Logo" />
      <Script src="/js/iframeResizer.contentWindow.min.js" />
    </button>
  );
}
