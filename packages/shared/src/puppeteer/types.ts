import { CDPSession, Page, SerializedAXNode as PuppeteerSerializedAXNode } from 'puppeteer-core';
import { ChromeTab } from '~shared/chrome/Tab';
import { IInteractable } from '~shared/interactable/IInteractable';
import { BackendNodeId, INodeId } from '~shared/interactable/types';

export enum PuppeteerEmptyPageReason {
  CHROME_INTERNAL_PAGE = 'chrome-internal-page',
  PAGE_DESTROYED = 'page-destroyed',
  RECEIVING_END_NOT_EXISTING = 'receiving-end-not-existing',
  UNKNOWN_ERROR = 'unknown-error',
}

export type SerializedAXSnapshotNode = PuppeteerSerializedAXNode & { id: INodeId; backendNodeId: BackendNodeId };

export type PuppeteerPageCreationResult =
  | { success: true; page: Page; session: CDPSession; interactable: IInteractable.Dom; tab: ChromeTab }
  | { success: false; reason: PuppeteerEmptyPageReason; tab: ChromeTab };
