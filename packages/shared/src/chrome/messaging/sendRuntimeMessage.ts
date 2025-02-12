import { ChromeTab, isChromeInternalPageTab } from '~shared/chrome/Tab';
import { ContentInjectionStatusFetchingService } from '~shared/injection/ContentInjectionStatusFetchingService';
import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';

export async function sendRuntimeMessage(message: RuntimeMessage): Promise<RuntimeMessageResponse> {
  if (!chrome?.runtime?.sendMessage) throw new Error('chrome.runtime.sendMessage is not available');

  let response;
  if (message.receiver === RuntimeMessageReceiver.CONTENT_INJECTION) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab) throw new Error('No active tab found');
    const activeTabId = tabs[0]?.id;
    if (!activeTabId) {
      ALogger.info({ context: 'No active tab found', stack: 'sendRuntimeMessage', tabs });
      throw new Error('No active tab found');
    }
    if (isChromeInternalPageTab(activeTab as ChromeTab)) {
      ALogger.warn({ context: 'Chrome internal page tab', stack: 'sendRuntimeMessage', activeTab });
      return { success: false, error: 'Chrome internal page tab' };
    }

    await ContentInjectionStatusFetchingService.waitUntilStatus(activeTabId, TabLifecycleStatus.DOM_COMPLETE);
    response = await chrome.tabs?.sendMessage(activeTabId, message);
  } else {
    response = await chrome.runtime.sendMessage(message);
  }
  if (chrome.runtime.lastError) {
    ALogger.error({ context: 'failed to send runtime message', error: chrome.runtime.lastError });
    return response;
  }
  return response as RuntimeMessageResponse;
}
