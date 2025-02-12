import { TargetInfo } from '~src/scripts/sandbox/index';

export const getAllTargetInfo = async (): Promise<TargetInfo[]> => {
  return await chrome.debugger.getTargets();
};

export const getTargetInfoByTabId = async (targetTabId: number): Promise<TargetInfo | undefined> => {
  const targets = await getAllTargetInfo();
  return targets.find((t) => t.tabId === targetTabId);
};
