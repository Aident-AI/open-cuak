'use client';

import cx from 'classnames';
import Image from 'next/image';
import { useState } from 'react';
import AidentLogo from '~assets/icons/aident-logo-white.svg';
import { AppSetting } from '~shared/app-settings/types';
import { useAppSettings } from '~src/hooks/useAppSettings';

interface Props {
  className?: string;
}

export default function CompanionLogo(props: Props) {
  const { value: isDebugMode, setAppSetting: setDebugMode } = useAppSettings(AppSetting.DEBUG_MODE);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleButtonPress = () => {
    const timeoutId = setTimeout(async () => setDebugMode(!isDebugMode), 3000);
    setTimer(timeoutId);
  };
  const handleButtonRelease = () => {
    if (!timer) return;
    clearTimeout(timer);
    setTimer(null);
  };

  return (
    <div
      className={cx('absolute left-1/2 flex -translate-x-1/2 flex-col items-center justify-center', props.className)}
    >
      <div className="flex w-fit flex-col items-center justify-center">
        <div className="flex flex-row items-center justify-center">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black"
            onMouseDown={handleButtonPress}
            onMouseUp={handleButtonRelease}
            onMouseLeave={handleButtonRelease} // In case the mouse leaves the button before release
            onTouchStart={handleButtonPress} // For touch devices
            onTouchEnd={handleButtonRelease} // For touch devices
          >
            <Image className="h-5 w-5" src={AidentLogo} alt="Aident Logo" />
          </div>
          <h1 className="ml-3 text-xl font-extralight text-black">Aident AI</h1>
        </div>
        <div className="mt-2 h-[0.5px] w-full bg-black"></div>
        <h1 className="ml-2 mr-2 mt-1 text-2xl font-medium tracking-wide text-black">Companion</h1>
      </div>
    </div>
  );
}
