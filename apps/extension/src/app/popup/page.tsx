'use client';

import { useEffect } from 'react';
import { ExecutionEnvironment, setExecEnv } from '~shared/env/ExecutionEnvironment';
import ExtensionPage from '~src/app/_components/ExtensionPage';
import { loadConfigJson } from '~src/common/loadConfigJson';

export default function PopupPage() {
  useEffect(() => {
    void setExecEnv(ExecutionEnvironment.EXTENSION_POPUP);
    void loadConfigJson('../../config.json');
  }, []);

  return <ExtensionPage isPopup={true} />;
}
