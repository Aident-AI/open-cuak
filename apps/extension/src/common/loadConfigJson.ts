export const loadConfigJson = async (url?: string) => {
  const src = url ?? chrome?.runtime.getURL('/config.json');
  const response = await fetch(src);
  const config = await response.json();

  if (!global) throw new Error('Global object not found');

  Object.entries(config).forEach(([key, value]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any)[key] = value;
  });
};
