import CompanionLogo from '~src/app/extension/home/CompanionLogo';
import DebugModeButtons from '~src/app/extension/home/DebugModeButtons';
import GetStartedButton from '~src/app/extension/home/GetStartedButton';
import OpenSidePanelButton from '~src/app/extension/home/OpenSidePanelButton';
import UserInfoSection from '~src/app/extension/home/UserInfoSection';

export default function ExtensionHomePage() {
  return (
    <div className="relative h-screen w-full">
      <CompanionLogo className="top-1/4 animate-fade" />
      <OpenSidePanelButton />
      <>
        <DebugModeButtons />
        <GetStartedButton />
        <UserInfoSection />
      </>
    </div>
  );
}
