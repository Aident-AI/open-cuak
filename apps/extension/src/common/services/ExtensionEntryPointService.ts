import { AppSetting } from '~shared/app-settings/types';
import { ChromeTab, toChromeTabOrThrow } from '~shared/chrome/Tab';
import { sendRuntimeMessage } from '~shared/chrome/messaging/sendRuntimeMessage';
import { isDevelopment } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ContentInjectionMessageAction } from '~shared/messaging/content-injection/types';
import { InteractableService } from '~src/common/interactable/InteractableService';
import { ManagedWindow } from '~src/common/puppeteer/ManagedWindow';
import { AppSettingsService } from '~src/common/services/AppSettingsService';
import { ActiveTabService } from '~src/common/services/tab/ActiveTabService';

export class ExtensionEntryPointService {
  public static start() {
    this.#startContextMenuListeners();
    this.#startShortcutListeners();
    this.#startExtensionButtonListeners();
  }

  static #startContextMenuListeners() {
    chrome.runtime.onInstalled.addListener(() => {
      ALogger.info('Aident Extension is installed!');

      chrome.contextMenus.create({
        id: 'openSidePanel',
        title: 'Open Aident at side',
        contexts: ['all'],
      });
      if (isDevelopment()) {
        chrome.contextMenus.create({
          id: 'startOrStopNodeIndicator',
          title: 'Start/Stop node indicator',
          contexts: ['all'],
        });
        chrome.contextMenus.create({
          id: 'copyTargetNanoid',
          title: 'Copy target nanoid',
          contexts: ['all'],
        });
      }
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      switch (info.menuItemId) {
        case 'openSidePanel': {
          this.#openSidePanel(toChromeTabOrThrow(tab));
          break;
        }

        case 'startOrStopNodeIndicator': {
          await InteractableService.attach();
          const indicatorOn = await AppSettingsService.fetch<boolean>(AppSetting.INTERACTABLE_NODE_INDICATOR);
          AppSettingsService.set(AppSetting.INTERACTABLE_NODE_INDICATOR, !indicatorOn);
          break;
        }

        case 'copyTargetNanoid': {
          await InteractableService.attach();
          AppSettingsService.set(AppSetting.INTERACTABLE_NODE_INDICATOR, true);
          await sendRuntimeMessage({
            receiver: RuntimeMessageReceiver.CONTENT_INJECTION,
            action: ContentInjectionMessageAction.DEBUGGER_COPY_NANOID_TO_CLIPBOARD,
          });
          break;
        }

        default:
          throw new Error('Unknown context menu item');
      }
    });
  }

  static #startShortcutListeners() {
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'openSidePanel') {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) =>
          this.#openSidePanel(toChromeTabOrThrow(tab)),
        );
      }
    });
  }

  static #startExtensionButtonListeners() {
    chrome.action.onClicked.addListener(async () => {
      if (ManagedWindow.isCurrentManaged()) {
        if (InteractableService.isAttached()) await InteractableService.detach();
        await ManagedWindow.removeCurrentFromManaged();
        await chrome.action.setBadgeText({ text: '', tabId: ActiveTabService.getInServiceWorker().id });
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab) throw new Error('no active tab found');
        this.#openSidePanel(toChromeTabOrThrow(tab));
      });
    });
  }

  // actions
  static async #openSidePanel(tab: ChromeTab) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (chrome.sidePanel as any).open({ tabId: tab.id });
    ALogger.debug('side panel opened');

    await InteractableService.attach();
    await ManagedWindow.addCurrentToBeManaged();
    await chrome.action.setBadgeText({ text: 'on', tabId: tab.id });
  }
}
