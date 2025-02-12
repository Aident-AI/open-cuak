'use client';

import cx from 'classnames';
import { useRef, useState } from 'react';
import useBroadcastForwarder from '~src/app/_hooks/useBroadcastForwarder';

interface Props {
  url: URL;
  onLoad: () => void;

  className?: string;
}

export default function ExtensionIframe({ url, onLoad, className }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  useBroadcastForwarder(iframeRef);

  const handleOnLoad = () => {
    setLoaded(true);
    onLoad();
  };

  return (
    <iframe
      ref={iframeRef}
      src={url.toString()}
      allow="clipboard-write"
      className={cx('h-full w-full', loaded ? 'block' : 'hidden', className)}
      onLoad={handleOnLoad}
    />
  );
}
