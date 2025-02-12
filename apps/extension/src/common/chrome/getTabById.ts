import { ChromeTab } from '~shared/chrome/Tab';

// TODO: create a TabService and merge with ActiveTabService
export const getTabByIdInServiceWorker = async (tabId?: number | null): Promise<ChromeTab | null> => {
  if (!chrome.tabs) throw new Error('chrome.tabs is not available');
  if (!tabId) return null;

  const tab = await chrome.tabs.get(tabId);
  if (!tab || !tab.id) return null;
  return tab as ChromeTab;
};
