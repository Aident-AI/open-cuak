import { CDPSession, Page } from 'puppeteer-core';
import { serializedNodeWithId } from 'rrweb-snapshot/typings/types';
import { ChromeTab } from '~shared/chrome/Tab';
import { IInteractable } from '~shared/interactable/IInteractable';
import { RuntimeMessage } from '~shared/messaging/types';
import { PuppeteerEmptyPageReason, PuppeteerPageCreationResult } from '~shared/puppeteer/types';
import { WaitUtilConfig } from '~shared/utils/WaitUtils';

export interface IInteractableServiceStatic {
  start(): Promise<void>;
  createInteractableForActiveTabOrThrow(): Promise<PuppeteerPageCreationResult>;
  attach(): Promise<void>;
  detach(): Promise<void>;
  isAttached(): boolean;
  refresh(): Promise<void>;
  sendCdpCommand(method: string, params?: unknown): Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendServiceWorkerMessage(message: RuntimeMessage): Promise<any>;
  isInteractableReady(): boolean;
  waitUntilInteractableReady(config?: WaitUtilConfig): Promise<void>;
  getInteractableOrThrow(): IInteractable.Dom;
  buildFromSnapshot(snapshot: serializedNodeWithId): Promise<IInteractable.Dom>;
  fetchSnapshot(): Promise<serializedNodeWithId>;
  fetchInteractable(): Promise<IInteractable.Dom>;
  getPageOrThrow(): Page;
  getCdpSessionOrThrow(): CDPSession;
  getEmptyPageReason(): PuppeteerEmptyPageReason | null;
  getActiveTab(): ChromeTab;
  getPageCreationResult(): PuppeteerPageCreationResult;
}
