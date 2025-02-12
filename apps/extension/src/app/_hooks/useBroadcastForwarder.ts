import { RefObject, useEffect } from 'react';
import { ContentBroadcastForwarder } from '~src/scripts/content-injection/message/ContentBroadcastForwarder';

export default function useBroadcastForwarder(target: RefObject<HTMLIFrameElement>) {
  useEffect(() => {
    if (!target.current) return;
    const iframe = target.current;
    new ContentBroadcastForwarder(iframe).start();
  }, [target]);
}
