'use client';

import { AcademicCapIcon, BriefcaseIcon, Cog8ToothIcon, KeyIcon } from '@heroicons/react/24/solid';
import cx from 'classnames';
import { useSearchParams } from 'next/navigation';
import { useContext, useEffect, useMemo, useState } from 'react';
import DebugInteractionsPage from '~src/app/extension/debug/interactions/DebugInteractionsPage';
import ChatWithAidenWindow from '~src/app/portal/ChatWithAidenWindow';
import CookieModal from '~src/app/portal/CookieModal';
import SOPExecutionWindow from '~src/app/portal/SOPExecutionWindow'; // Add this import
import SOPModal from '~src/app/portal/SOPModal';
import TeachAidenWindow from '~src/app/portal/TeachAidenWindow';
import UserConfigModal from '~src/app/portal/UserConfigModal';
import { WebsocketRemoteBrowserWindow } from '~src/app/portal/WebsocketRemoteBrowserWindow';
import { MeshBackgroundWithUserSession } from '~src/components/MeshBackgroundWithUserSession';
import { BrowserRewindHistoryProvider } from '~src/contexts/BrowserRewindHistoryContext';
import { InteractionEventProvider } from '~src/contexts/InteractionEventContext';
import { UserSessionContext } from '~src/contexts/UserSessionContext';
import { useSopStore } from '~src/store/sopStore';

export default function PortalPage() {
  const [remoteBrowserSessionId, setRemoteBrowserSessionId] = useState<string | undefined>(undefined);
  const [showDebugInteractions, setShowDebugInteractions] = useState(false);
  const [hideChatWithAiden, setHideChatWithAiden] = useState(false);
  const [teachModeOn, setTeachModeOn] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [showUserConfigModal, setShowUserConfigModal] = useState(false);
  const [shouldStartSop, setShouldStartSop] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);

  const { sops, isLoading, fetchSops } = useSopStore();

  const { session } = useContext(UserSessionContext);

  const searchParams = useSearchParams();
  const sopId = searchParams?.get('sopId');

  useEffect(() => {
    if (!sopId) return;
    if (sops.length === 0 && !isLoading) fetchSops();
  }, [sopId]);

  const selectedSop = useMemo(() => {
    return sopId && sops.length > 0 ? sops.find((s) => s.id === sopId) : undefined;
  }, [sopId, sops]);

  const renderChatWindow = () => {
    if (hideChatWithAiden) return null;
    if (teachModeOn)
      return (
        <TeachAidenWindow
          className="flex w-96 flex-shrink-0 flex-grow-0 p-4 pt-20"
          remoteBrowserSessionId={remoteBrowserSessionId}
        />
      );
    if (selectedSop)
      return (
        <SOPExecutionWindow
          className="flex w-96 flex-shrink-0 flex-grow-0 p-4 pt-20"
          remoteBrowserSessionId={remoteBrowserSessionId}
          sop={selectedSop}
          shouldStartSop={shouldStartSop}
        />
      );
    return (
      <ChatWithAidenWindow
        className="flex w-96 flex-shrink-0 flex-grow-0 p-4 pt-20"
        remoteBrowserSessionId={remoteBrowserSessionId}
      />
    );
  };

  return (
    <InteractionEventProvider>
      <BrowserRewindHistoryProvider>
        <MeshBackgroundWithUserSession navigationTargetPath="/home" navigationTitle="Home">
          <WebsocketRemoteBrowserWindow
            className="flex h-full w-4/5 flex-1 flex-shrink-0 flex-grow"
            remoteBrowserSessionId={remoteBrowserSessionId}
            setHideChatWithAiden={setHideChatWithAiden}
            setRemoteBrowserSessionId={setRemoteBrowserSessionId}
            teachModeOn={teachModeOn}
            turnOffTeachMode={() => setTeachModeOn(false)}
            setShouldStartSop={selectedSop ? setShouldStartSop : undefined}
          />
          {renderChatWindow()}

          <div className="fixed bottom-4 left-4 z-50 flex h-fit w-fit flex-row text-white">
            <button
              className={cx(
                'mx-1 h-fit w-fit rounded-full p-2 text-white shadow-2xl shadow-black',
                teachModeOn ? 'bg-green-300/50' : 'bg-blue-300/50',
              )}
              onClick={() => setTeachModeOn((prev) => !prev)}
            >
              <AcademicCapIcon className="h-6 w-6" />
            </button>
            <button
              className="mx-1 h-fit w-fit rounded-full bg-blue-300/50 p-2 text-white shadow-2xl shadow-black"
              onClick={() => setShowCookieModal(true)}
            >
              <KeyIcon className="h-6 w-6" />
            </button>
            <button
              className="mx-1 h-fit w-fit rounded-full bg-blue-300/50 p-2 text-white shadow-2xl shadow-black"
              onClick={() => setShowUserConfigModal(true)}
            >
              <Cog8ToothIcon className="h-6 w-6" />
            </button>
            <button
              className="mx-1 h-fit w-fit rounded-full bg-blue-300/50 p-2 text-white shadow-2xl shadow-black"
              onClick={() => setShowSopModal(true)}
            >
              <BriefcaseIcon className="h-6 w-6" />
            </button>
          </div>

          {showDebugInteractions && (
            <div className="absolute bottom-0 right-0 z-50 flex h-full w-[20%] flex-shrink-0 flex-grow-0 items-center justify-center bg-black/80 backdrop-blur-sm">
              <DebugInteractionsPage
                remoteBrowserSessionId={remoteBrowserSessionId}
                onClose={() => setShowDebugInteractions(false)}
              />
            </div>
          )}
          {showCookieModal && <CookieModal isOpen={showCookieModal} onClose={() => setShowCookieModal(false)} />}
          {showUserConfigModal && (
            <UserConfigModal
              userId={session?.user?.id ?? ''}
              isOpen={showUserConfigModal}
              onClose={() => setShowUserConfigModal(false)}
            />
          )}
          {showSopModal && <SOPModal isOpen={showSopModal} onClose={() => setShowSopModal(false)} />}
        </MeshBackgroundWithUserSession>
      </BrowserRewindHistoryProvider>
    </InteractionEventProvider>
  );
}
