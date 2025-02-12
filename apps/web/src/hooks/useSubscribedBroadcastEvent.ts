import { useEffect, useState } from 'react';
import { BroadcastEvent } from '~shared/broadcast/types';
import { useBroadcastService } from '~src/hooks/useBroadcastService';

export function useSubscribedBroadcastEvent<T>(event: BroadcastEvent, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const { subscribe, fetch } = useBroadcastService();

  useEffect(() => {
    const exec = async () => {
      subscribe<T>(event, (newValue: T) => setValue(newValue));

      const value = await fetch<T>(event);
      if (value) setValue(value);
    };
    exec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
