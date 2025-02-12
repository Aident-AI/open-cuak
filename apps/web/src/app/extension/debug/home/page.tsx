'use client';

import _ from 'lodash';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppSetting, InferenceServer } from '~shared/app-settings/types';
import { BroadcastEventType } from '~shared/broadcast/types';
import { getHost } from '~shared/env/environment';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { FetchInteractableTree_ActionConfig } from '~shared/messaging/action-configs/interactable/FetchInteractableTree.ActionConfig';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import ButtonListPage from '~src/app/extension/debug/home/ButtonListPage';
import { useAppSettings } from '~src/hooks/useAppSettings';
import { useExtensionService } from '~src/hooks/useExtensionService';
import { useSubscribedBroadcastEvent } from '~src/hooks/useSubscribedBroadcastEvent';

export default function DebugHome() {
  const { sendRuntimeMessage } = useExtensionService();
  const { value: inferenceServer, setAppSetting: setInferenceServer } = useAppSettings(AppSetting.INFERENCE_SERVER);
  const { value: indicatorOn, setAppSetting: setIndicatorOn } = useAppSettings(AppSetting.INTERACTABLE_NODE_INDICATOR);
  const { attached: isAttached } = useSubscribedBroadcastEvent<{ attached: boolean }>(
    { type: BroadcastEventType.INTERACTABLE_SERVICE_ATTACHED },
    { attached: false },
  );
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | undefined>(undefined);
  const [actionButton, setActionButton] = useState<JSX.Element | undefined>(undefined);
  const [mockUserId, setMockUserId] = useState<string | undefined>(undefined);

  // buttons
  const switchInferenceServer = () =>
    setInferenceServer(inferenceServer === InferenceServer.CLOUD ? InferenceServer.LOCAL : InferenceServer.CLOUD);
  const attachOrDetach = async (type: 'attach' | 'detach') =>
    sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.INTERPRET_LINE,
      payload: type === 'attach' ? `is.attach()` : `is.detach()`,
    });
  const copyInteractableTree = async () => {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.FETCH_INTERACTABLE_TREE,
      payload: {},
    });
    if (!rsp?.success || !rsp.data) throw new Error('Failed to fetch interactable tree.');
    const tree = FetchInteractableTree_ActionConfig.responsePayloadSchema.parse(rsp.data).tree;

    await navigator.clipboard.writeText(JSON.stringify(tree, null, 2));
    showToast('Interactable tree copied to clipboard.');
  };
  const cacheCookies = async () => {
    const rsp = await sendRuntimeMessage({
      receiver: RuntimeMessageReceiver.SERVICE_WORKER,
      action: ServiceWorkerMessageAction.CACHE_COOKIES,
    });
    if (!rsp?.success) {
      showToast('Failed to cache cookies...');
      throw new Error('Failed to cache cookies: ' + (rsp.error ?? 'Unknown error'));
    } else showToast('Success!');
  };

  const buttons = [
    { text: 'Debug Interactions', onClick: () => router.push(getHost() + '/extension/debug/interactions') },
    { text: 'Copy Interactable Tree', onClick: copyInteractableTree },
    {
      text: 'Interactable: ' + (isAttached ? 'ATTACHED' : 'DETACHED'),
      onClick: () => attachOrDetach(isAttached ? 'detach' : 'attach'),
    },
    {
      text: `Switch Server: ${_.upperCase(inferenceServer?.toString() ?? 'unknown')}`,
      onClick: switchInferenceServer,
    },
    {
      text: 'Node Indicator: ' + (indicatorOn ? 'ON' : 'OFF'),
      onClick: () => {
        setIndicatorOn(!indicatorOn);
        if (!indicatorOn) attachOrDetach('attach');
      },
    },
    { text: 'Cache Cookies for Bot', onClick: cacheCookies },
  ];

  // snackbar
  const showToast = (message: string, actionButton?: JSX.Element) => {
    setToastMessage(message);
    setActionButton(actionButton);
  };

  return (
    <ButtonListPage
      buttons={buttons}
      listClassName="justify-center"
      snackbar={{ actionButton, message: toastMessage, onClose: () => setToastMessage(undefined) }}
    />
  );
}
