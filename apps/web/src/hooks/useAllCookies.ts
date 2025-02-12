import { getCookies } from 'cookies-next';

const isSsr = (): boolean => typeof window === 'undefined';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookies = isSsr() ? require('next/headers').cookies : undefined;

export function useAllCookies(): object {
  return cookies ? cookies().getAll() : getCookies();
}
