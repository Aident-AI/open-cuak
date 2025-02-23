export const getEnvValue = (key?: string | null) => (isEnvValueSet(key) ? (key as string) : undefined);
export const isEnvValueSet = (key?: string | null) => key !== undefined && key !== null && key.trim() !== '';
export const isStringConfigOn = (key?: string | null) => (key ?? '').toLowerCase() === 'true';

export const isDevelopment = () => process.env.NEXT_PUBLIC_BUILD_ENV === 'development';
export const isDocker = () => {
  if (process.env.DOCKER_ENV !== undefined) {
    return isStringConfigOn(process.env.DOCKER_ENV);
  }
  return (global as any)?.isDocker ?? false;
};

export const getHost = (): string => {
  const host = getDockerFriendlyUrl(process.env.NEXT_PUBLIC_ORIGIN);
  if (!host) throw new Error('Host not found');
  return host;
};

export const getExtensionId = () => {
  if (!chrome.runtime?.id) throw new Error('Extension ID not found');
  return chrome.runtime.id;
};

export const isChromeExtensionPage = () => {
  if (typeof window === 'undefined') return false;

  const extensionPage = window.location.protocol === 'chrome-extension:';
  const pageInChromeContainer =
    window !== window.parent && window.location?.ancestorOrigins[0]?.startsWith('chrome-extension://') === true;
  return extensionPage || pageInChromeContainer;
};

export const isDebuggingInProd = isStringConfigOn(process.env.DEBUG_IN_PROD);

export const getDockerFriendlyUrl = (url?: string): string => {
  if (!url) return '';
  if (!isDocker()) return url;
  return url.replaceAll('localhost', 'host.docker.internal').replaceAll('127.0.0.1', 'host.docker.internal');
};
