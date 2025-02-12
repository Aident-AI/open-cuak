import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { ALogger } from '~shared/logging/ALogger';
import { loadConfigJson } from '~src/common/loadConfigJson';
import { SandboxMessagingService } from '~src/scripts/sandbox/services/SandboxMessagingService';

export type TargetInfo = chrome.debugger.TargetInfo;

const initSandbox = async () => {
  await ALogger.genInit(undefined, ExecutionEnvironment.EXTENSION_SANDBOX); // TODO: set the extension session id for realtime channel
  await loadConfigJson('../../config.json');
  SandboxMessagingService.initForwarderInSandbox();
};
initSandbox();
