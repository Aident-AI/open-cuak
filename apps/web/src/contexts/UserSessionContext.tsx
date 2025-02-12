'use client';

import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import _ from 'lodash';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useEffect, useState } from 'react';
import { BroadcastEventType } from '~shared/broadcast/types';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { isChromeExtensionPage } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { SupabaseUserSession } from '~shared/supabase/SupabaseAuthTokens';
import { SupabaseClientForClient } from '~shared/supabase/client/SupabaseClientForClient';
import { BaseContextProviderProps } from '~src/contexts/shared';
import { useBroadcastService } from '~src/hooks/useBroadcastService';
import { useExtensionService } from '~src/hooks/useExtensionService';

export interface UserSessionContextType {
  isAdminUser: boolean;
  session: Session | null;
  supabase: SupabaseClient | null;
  user: User | null;

  logout: (redirectTo?: string) => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
}

export const DefaultUserSessionContext = {
  isAdminUser: false,
  session: null,
  supabase: null,
  user: null,

  logout: async (redirectTo?: string) => {
    throw new Error('UserSessionContext is not initialized. ' + JSON.stringify({ redirectTo }));
  },
  setSession: (session: Session | null) => {
    throw new Error('UserSessionContext is not initialized. ' + JSON.stringify({ session }));
  },
};

export const UserSessionContext = createContext<UserSessionContextType>(DefaultUserSessionContext);

export const UserSessionContextProvider = ({
  children,
  requestId,
}: BaseContextProviderProps & { requestId: string }) => {
  const { fetch, subscribe } = useBroadcastService();
  const { sendRuntimeMessage } = useExtensionService();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const supabase = SupabaseClientForClient.createForClientComponent();

  useEffect(() => {
    const exec = async () => {
      await ALogger.genInit(requestId, ExecutionEnvironment.WEB_CLIENT);

      const updateUserSession = (newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      };
      supabase.auth.onAuthStateChange((event, newSession) => updateUserSession(newSession));

      const fetchSessionFromClient = async () => {
        const { data } = await supabase.auth.getSession();
        updateUserSession(data.session);
      };
      const fetchUserSessionFromServiceWorker = async () => {
        subscribe({ type: BroadcastEventType.USER_SESSION_UPDATED }, async (userSession) => {
          updateUserSession((userSession as SupabaseUserSession)?.session ?? null);
        });

        const payload = (await fetch<SupabaseUserSession>({ type: BroadcastEventType.USER_SESSION_UPDATED })) ?? null;
        if (!payload?.session) {
          ALogger.info({ context: 'User not logged in', stack: 'UserSessionContext' });
          return;
        }
        if (_.isEqual(payload.session, session)) {
          ALogger.info({ context: 'Same session received. Skip update', stack: 'UserSessionContext' });
          return;
        }
        updateUserSession(payload.session);
        supabase.auth.setSession(payload.session);
      };
      const sessionFetch = isChromeExtensionPage() ? fetchUserSessionFromServiceWorker : fetchSessionFromClient;
      await sessionFetch();
    };

    exec();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async (redirectTo?: string) => {
    if (isChromeExtensionPage()) {
      sendRuntimeMessage({
        receiver: RuntimeMessageReceiver.SERVICE_WORKER,
        action: ServiceWorkerMessageAction.GO_LOGIN,
      });
      return;
    }

    await supabase.auth.signOut();
    if (redirectTo) router.replace(redirectTo);
    if (!pathname) return;
    router.replace(pathname);
  };

  const setSessionToState = async (newSession: Session | null) => {
    if (!newSession) {
      if (session) await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      return;
    }

    await supabase.auth.setSession(newSession);
    setSession(newSession);
    setUser(newSession.user ?? null);
  };

  const isAdminUser = false; // TODO: hardcode for now

  return (
    <UserSessionContext.Provider
      value={{ isAdminUser, session, supabase, user, logout, setSession: setSessionToState }}
    >
      {children}
    </UserSessionContext.Provider>
  );
};
