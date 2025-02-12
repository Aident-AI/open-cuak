import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { TabLifecycleStatus } from '~shared/injection/TabLifecycleStatus';
import { ALogger } from '~shared/logging/ALogger';
import { WaitUtils } from '~shared/utils/WaitUtils';
import { loadConfigJson } from '~src/common/loadConfigJson';
import { TabLifecycleInjectionService } from '~src/common/services/tab/TabLifecycleInjectionService';
import { ContentInjectionStatusLabelInjection } from '~src/scripts/content-injection/ContentInjectionStatusLabelInjection';
import { DebuggerToolInjection } from '~src/scripts/content-injection/DebuggerToolInjection';
import { ExtensionIframeInjection } from '~src/scripts/content-injection/ExtensionIframeInjection';
import { MouseTrackingInjection } from '~src/scripts/content-injection/MouseTrackingInjection';
import { ContentInjectionMessageService } from '~src/scripts/content-injection/message/ContentInjectionMessageService';
import { ContentMessageHandler } from '~src/scripts/content-injection/message/ContentMessageHandler';
import { SandboxPageInjection } from '~src/scripts/sandbox/SandboxPageInjection';

const exec = async () => {
  await ALogger.genInit(undefined, ExecutionEnvironment.EXTENSION_CONTENT_INJECTION); // TODO: set the extension session id for realtime channel
  await loadConfigJson();

  ALogger.debug({ context: 'Aident Companion starting...' });

  void ContentMessageHandler.init();
  void ContentInjectionStatusLabelInjection.init();
  await TabLifecycleInjectionService.inject();
  void TabLifecycleInjectionService.updateStatus(TabLifecycleStatus.LOADING); // non-blocking
  void ContentInjectionStatusLabelInjection.update(TabLifecycleStatus.LOADING);

  ALogger.debug({ context: 'Aident Companion loading...' });

  await Promise.all([
    ContentInjectionMessageService.inject(),
    DebuggerToolInjection.init(),
    ExtensionIframeInjection.init(),
    MouseTrackingInjection.init(),
    SandboxPageInjection.init(),
  ]);

  ALogger.debug({ context: 'Aident Companion LOADED!' });

  void TabLifecycleInjectionService.updateStatus(TabLifecycleStatus.LOADED); // non-blocking
  void ContentInjectionStatusLabelInjection.update(TabLifecycleStatus.LOADED);

  await WaitUtils.waitUntil(() => document.readyState === 'complete');
  await TabLifecycleInjectionService.updateStatus(TabLifecycleStatus.DOM_COMPLETE);
  void ContentInjectionStatusLabelInjection.update(TabLifecycleStatus.DOM_COMPLETE);

  ALogger.debug({ context: 'Aident Companion DOM_COMPLETE!' });
};

window.addEventListener(
  'beforeunload',
  async () => await TabLifecycleInjectionService.updateStatus(TabLifecycleStatus.UNLOADED),
);

exec();
