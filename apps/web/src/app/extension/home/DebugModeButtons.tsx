'use client';

import { useRouter } from 'next/navigation';
import { AppSetting } from '~shared/app-settings/types';
import { getHost } from '~shared/env/environment';
import DefaultButton from '~src/app/extension/home/DefaultButton';
import { useAppSettings } from '~src/hooks/useAppSettings';

export default function DebugModeButtons() {
  const { value: isDebugMode } = useAppSettings(AppSetting.DEBUG_MODE);
  const router = useRouter();

  if (!isDebugMode) return null;

  return (
    <>
      <DefaultButton
        className="bottom-64 bg-sky-200 animate-delay-300"
        onClick={() => router.push(getHost() + '/extension/debug/interpreter')}
      >
        Open Interpreter
      </DefaultButton>
      <DefaultButton
        className="bottom-48 bg-sky-200 animate-delay-200"
        onClick={() => router.push(getHost() + '/extension/debug/home')}
      >
        Debug Mode
      </DefaultButton>
      <DefaultButton
        className="bottom-32 bg-sky-200 animate-delay-100"
        onClick={() => router.push(getHost() + '/extension/shadow-mode')}
      >
        Start Shadowing
      </DefaultButton>
    </>
  );
}
