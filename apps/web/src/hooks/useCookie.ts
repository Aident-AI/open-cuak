'use client';

import { getCookie, setCookie } from 'cookies-next';
import { useState } from 'react';
import { z } from 'zod';

const isSsr = (): boolean => typeof window === 'undefined';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookies = isSsr() ? require('next/headers').cookies : undefined;

export function useCookie<T>(
  key: string,
  initialValue?: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: z.ZodObject<any, any>,
): [T, (newVal: T) => void] {
  const [item, setItemState] = useState<T>(() => {
    const value = cookies ? cookies().get(key)?.value : getCookie(key);
    const object = !value ? null : schema ? schema.parse(value) : JSON.parse(value);
    return object ? object : initialValue;
  });

  const setItem = (value: T) => {
    setItemState(value);
    if (cookies) {
      cookies().set(key, JSON.stringify(value));
    } else {
      setCookie(key, JSON.stringify(value));
    }
  };

  return [item, setItem];
}
