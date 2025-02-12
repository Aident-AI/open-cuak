'use client';

import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid';
import { useSearchParams } from 'next/navigation';
import { isStringConfigOn } from '~shared/env/environment';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { useExtensionService } from '~src/hooks/useExtensionService';

export default function OpenSidePanelButton() {
  const searchParams = useSearchParams();
  const { sendRuntimeMessage } = useExtensionService();

  const isPopup = isStringConfigOn(searchParams?.get('isPopup'));
  if (!isPopup) return null;

  const openSidePanel = async () => {
    await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.OPEN_SIDE_PANEL,
    });
  };

  return (
    <button
      onClick={openSidePanel}
      className="absolute right-4 top-4 rounded-full bg-sky-600/95 p-1.5 shadow-centered shadow-fuchsia-600/50 backdrop-blur-sm hover:shadow-fuchsia-600/30"
    >
      <ArrowLeftOnRectangleIcon className="h-3 w-3 scale-x-[-1] text-white" />
    </button>
  );
}
