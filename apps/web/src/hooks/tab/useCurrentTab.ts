import { useEffect, useState } from 'react';
import { ChromeTab } from '~shared/chrome/Tab';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { useExtensionService } from '~src/hooks/useExtensionService';

export function useCurrentTab() {
  const [tab, setTab] = useState<ChromeTab | null>(null);
  const { sendRuntimeMessage } = useExtensionService();

  useEffect(() => {
    const fetchCurrentTab = async () => {
      const rsp = await sendRuntimeMessage<ChromeTab>({
        receiver: RuntimeMessageReceiver.SERVICE_WORKER,
        action: ServiceWorkerMessageAction.GET_CURRENT_TAB,
      });
      if (!rsp || !rsp.success) throw new Error('Failed to get current tab');
      if (!rsp.data?.id) throw new Error('Invalid tab');

      setTab(rsp.data);
    };
    fetchCurrentTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { currentTab: tab };
}
