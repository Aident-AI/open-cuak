'use client';

import { useContext } from 'react';
import { UserSessionContext } from '~src/contexts/UserSessionContext';

export default function UserInfoSection() {
  const { user, logout } = useContext(UserSessionContext);

  if (!user) return null;

  return (
    <div className="absolute bottom-2 left-0 flex w-screen origin-left animate-fade-up flex-col items-center animate-delay-100">
      <a className="w-fit font-medium">{user?.email}</a>
      <button className="underline" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}
