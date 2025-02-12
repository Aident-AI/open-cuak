import { BroadcastEventType } from '~shared/broadcast/types';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { isDevelopment, isDocker } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { InteractableService } from '~src/common/interactable/InteractableService';
import { loadConfigJson } from '~src/common/loadConfigJson';
import { ManagedWindow } from '~src/common/puppeteer/ManagedWindow';
import { AppSettingsService } from '~src/common/services/AppSettingsService';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { ExtensionEntryPointService } from '~src/common/services/ExtensionEntryPointService';
import { SupabaseService } from '~src/common/services/SupabaseService';
import { UserSessionService } from '~src/common/services/UserSessionService';
import { InterpreterService } from '~src/common/services/interpreter/InterpreterService';
import { RRReplayerWorkerService } from '~src/common/services/shadow-mode/RRReplayerWorkerService';
import { ShadowModeWorkerService } from '~src/common/services/shadow-mode/ShadowModeWorkerService';
import { ActiveTabLifecycleWorkerService } from '~src/common/services/tab/ActiveTabLifecycleWorkerService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';
import { SessionStorageDebugger } from '~src/scripts/service-worker/SessionStorageDebugger';
import { WebRequestObserver } from '~src/scripts/service-worker/WebRequestObserver';
import { ServiceWorkerMessageHandler } from '~src/scripts/service-worker/message/ServiceWorkerMessageHandler';

const exec = async () => {
  await ALogger.genInit('placeholder', ExecutionEnvironment.EXTENSION_SERVICE_WORKER); // TODO: set the extension session id for realtime channel
  await loadConfigJson();

  ALogger.debug({ context: 'start to load service worker', stack: 'ServiceWorker' });

  // These requires to be the first in order to properly listen to chrome events (e.g. chrome.runtime, chrome.contextMenus, chrome.commands, chrome.action, etc)
  ExtensionEntryPointService.start();

  await BroadcastService.start();
  await ActiveTabService.start();
  await Promise.all([
    ActiveTabLifecycleWorkerService.start(),
    AppSettingsService.start(),
    InteractableService.start(),
    InterpreterService.start(),
    RRReplayerWorkerService.start(),
    ServiceWorkerMessageHandler.start(),
    SupabaseService.start(),
    ShadowModeWorkerService.start(),
    UserSessionService.start(),
  ]);

  if (isDevelopment()) new SessionStorageDebugger().start();
  if (isDevelopment()) new WebRequestObserver().start();
  if (isDocker()) await ManagedWindow.addCurrentToBeManaged();

  // reload content injection upon extension reload
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.id || !tab.url || tab.status !== 'complete' || tab.url.startsWith('chrome')) return;
      try {
        // TODO: reload `workers/content/ContentWorker.js` as well
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['scripts/content-injection/index.js'] });
      } catch (e) {
        ALogger.warn({ context: 'failed to inject content script', tabId: tab.id, tabUrl: tab.url, error: e });
      }
    });
  });

  BroadcastService.send<boolean>({ type: BroadcastEventType.SERVICE_WORKER_READY }, true);
};
exec();
