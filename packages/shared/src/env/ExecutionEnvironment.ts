import { EnumUtils } from '~shared/utils/EnumUtils';

export enum ExecutionEnvironment {
  BROWSERLESS_WS_SERVER = 'browserless-ws-server',
  EXTENSION = 'extension',
  EXTENSION_API_PAGE = 'extension-api-page',
  EXTENSION_CONTENT_INJECTION = 'extension-content-injection',
  EXTENSION_POPUP = 'extension-popup',
  EXTENSION_SANDBOX = 'extension-sandbox',
  EXTENSION_SERVICE_WORKER = 'extension-service-worker',
  EXTENSION_SIDE_PANEL = 'extension-side-panel',
  IME = 'ime',
  OFFICIAL_WEBSITE = 'official-website',
  SCRIPTS = 'scripts',
  WEB_API = 'web-api',
  WEB_API_ASYNC = 'web-api-async',
  WEB_CLIENT = 'web-client',
  WEB_SERVER_ACTION = 'web-server-action',
  WORKERS = 'workers',
}

export const setExecEnv = (env: ExecutionEnvironment): void => {
  const environment = EnumUtils.getEnumValue(ExecutionEnvironment, env);
  if (!environment) throw new Error('env is not valid: ' + env);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).ExecutionEnvironment = environment;
};

export const getExecEnv = (): ExecutionEnvironment => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (global as any).ExecutionEnvironment ?? process.env.EXECUTION_ENVIRONMENT;
  if (!env) throw new Error('ExecutionEnvironment is not set');
  return env;
};
