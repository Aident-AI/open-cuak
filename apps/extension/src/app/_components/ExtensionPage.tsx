'use client';

import cx from 'classnames';
import { delay } from 'lodash';
import { ReactNode, useEffect, useState } from 'react';
import { getExtensionId, getHost } from '~shared/env/environment';
import CompanionLogo from '~src/app/_components/CompanionLogo';
import ExtensionIframe from '~src/app/_components/ExtensionIframe';
import '~src/app/styles.scss';

interface Props {
  isPopup: boolean;
}

export default function ExtensionPage({ isPopup }: Props) {
  const [animated, setAnimated] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState<ReactNode>(null);

  useEffect(() => {
    delay(() => setAnimated(true), 1000);

    const url = new URL(getHost() + '/extension/home?isPopup=' + (isPopup ? 'true' : 'false'));
    const iframe = <ExtensionIframe url={url} onLoad={() => setLoaded(true)} />;
    setContent(iframe);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type !== 'fetch-extension-id') return;
      if (!event.source?.postMessage) throw new Error('Invalid event source');
      event.source.postMessage(
        { type: 'aident-extension-id', payload: getExtensionId() },
        { targetOrigin: event.origin },
      );
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <main
      className={cx('relative flex h-screen min-h-[33rem] w-full min-w-[18rem] flex-col overflow-hidden', 'mesh-bg')}
    >
      {(!loaded || !animated) && <CompanionLogo className={cx('top-1/4 z-50 animate-fade')} />}
      {content}
    </main>
  );
}
