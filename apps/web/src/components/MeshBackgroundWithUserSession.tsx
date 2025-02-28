'use client';

import { Tooltip } from '@mui/material';
import cx from 'classnames';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import NavigationButton from '~src/components/NavigationButton';
import '~src/components/styles/mesh-bg.scss';
import { UserSessionContext } from '~src/contexts/UserSessionContext';

interface Props {
  children: React.ReactNode;

  disableNavigationButton?: boolean;
  disableUserSessionBar?: boolean;
  navigationTargetPath?: string;
  navigationTitle?: string;
}

export function MeshBackgroundWithUserSession(props: Props) {
  const { session, logout } = useContext(UserSessionContext);
  const router = useRouter();

  const onClick = async () => {
    if (!session) {
      router.push('/login?target=%2Fportal');
      return;
    }

    await logout('/');
    window.location.reload();
  };
  const text = !session ? 'Login' : session.user?.email || 'logout';
  const tooltip = !session ? 'Click to login' : 'Click to logout';

  const renderUserSessionBar = () => {
    if (props.disableUserSessionBar) return null;

    return (
      <Tooltip placement="bottom" arrow title={<p className="text-xs">{tooltip}</p>} enterDelay={300}>
        <button
          className="text-foreground bg-btn-background hover:bg-btn-background-hover group absolute right-8 top-8 z-50 flex items-center rounded-md px-4 py-2 text-center text-sm text-white no-underline"
          onClick={onClick}
        >
          {text}
        </button>
      </Tooltip>
    );
  };

  return (
    <main className={cx('flex h-screen w-screen', 'mesh-bg')}>
      {!props.disableNavigationButton && (
        <NavigationButton title={props.navigationTitle} targetPath={props.navigationTargetPath} />
      )}
      {renderUserSessionBar()}
      {props.children}
    </main>
  );
}
