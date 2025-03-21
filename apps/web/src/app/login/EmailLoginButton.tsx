'use client';

import { EnvelopeIcon } from '@heroicons/react/24/solid';
import cx from 'classnames';
import { useRouter, useSearchParams } from 'next/navigation';
import { getHost } from '~shared/env/environment';

interface Props {
  title: string;
  className?: string;
}

export function EmailLoginButton(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  let emailLoginUrl = '/login/email';
  if (searchParams) emailLoginUrl += '?' + searchParams.toString();

  return (
    <div className={cx('h-12 w-full max-w-64', props.className)}>
      <button
        className="flex h-full w-full items-center justify-center rounded border-2"
        onClick={() => router.push(getHost() + emailLoginUrl)}
      >
        <EnvelopeIcon className="mr-4 w-6 text-black opacity-60" />
        <p className="w-7/12 text-xs text-black plus:text-sm">{props.title}</p>
      </button>
    </div>
  );
}
