import { Session, User } from '@supabase/supabase-js';
import { AppSetting } from '~shared/app-settings/types';
import { BroadcastEventType } from '~shared/broadcast/types';
import { getHost } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseAuthTokens, SupabaseUserSession } from '~shared/supabase/SupabaseAuthTokens';
import { AppSettingsService } from '~src/common/services/AppSettingsService';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { SupabaseService } from '~src/common/services/SupabaseService';

export type UserSessionListener = (newSession: SupabaseUserSession) => Promise<void> | void;

export class UserSessionService {
  public static async start() {
    const supabase = SupabaseService.client;
    if (!supabase) throw new Error('Supabase client is not initialized');

    this.#instance = new UserSessionService();
    ALogger.info({ context: 'UserSessionService initialized', stack: 'UserSessionService' });
  }

  public static onChange(listener: UserSessionListener) {
    BroadcastService.subscribeType(
      BroadcastEventType.USER_SESSION_UPDATED,
      async (_, newValue) => await listener(newValue as SupabaseUserSession),
    );
  }

  public static get userSession(): SupabaseUserSession {
    return this._instance.#userSession;
  }

  public static get session(): Session | null {
    return this._instance.#userSession?.session ?? null;
  }

  public static get user(): User | null {
    return this._instance.#userSession?.user ?? null;
  }

  private static get _instance() {
    if (!this.#instance) throw new Error('UserSessionService is not initialized');
    return this.#instance;
  }

  static #instance: UserSessionService;

  private constructor() {
    const cookieHandler = async (cookie: chrome.cookies.Cookie, removed: boolean) => {
      const name = cookie?.name ?? '';
      if (!this.#isAuthTokenCookieName(name)) return;

      const handleNewSession = async (uerSession: SupabaseUserSession): Promise<void> => {
        this.#userSession = uerSession;
        await BroadcastService.send({ type: BroadcastEventType.USER_SESSION_UPDATED }, uerSession ?? {});
        await AppSettingsService.set(AppSetting.DEBUG_MODE, false);
      };

      if (removed) {
        ALogger.info({ context: 'cookie removed', stack: 'UserSessionService', cookie });
        SupabaseService.client?.auth.signOut();
        await handleNewSession(null);
        return;
      }

      ALogger.info({ context: 'cookie changed', stack: 'UserSessionService', cookie });
      const userSession = await this.#fetchUserSessionFromCookies();
      if (!userSession) ALogger.warn({ context: 'User session not found', stack: 'UserSessionService' });
      await handleNewSession(userSession);
      ALogger.info({ context: 'userSession fetched from cookie', stack: 'UserSessionService', userSession });
    };

    chrome.cookies.onChanged.addListener(async ({ cookie, removed }) => cookieHandler(cookie, removed));
    chrome.cookies.getAll({ url: getHost() }, async (cookies) => {
      const authTokenCookies = cookies.filter((cookie) => this.#isAuthTokenCookieName(cookie.name));
      if (authTokenCookies.length < 1) return;

      for (const cookie of authTokenCookies) {
        cookieHandler(cookie, false);
        if (this.#userSession) break;
      }
    });
  }

  #userSession: SupabaseUserSession = null;

  async #fetchUserSessionFromCookies(): Promise<SupabaseUserSession> {
    const authTokens = await this.#fetchAuthTokensFromChromeCookies();
    if (!authTokens) return null;

    const { name, accessToken, refreshToken } = authTokens;
    const { data, error } = await SupabaseService.client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw new Error(error.message);

    const { session, user } = data;
    if (!session || !user) throw new Error('User not logged in');
    const { access_token, refresh_token } = session;
    if (!access_token || !refresh_token) throw new Error('Invalid session tokens');

    if (accessToken !== access_token || refreshToken !== refresh_token) {
      const newAuthTokens = { name, accessToken: access_token, refreshToken: refresh_token };
      await this.#updateAuthTokensInChromeCookies(newAuthTokens);
    }

    return { session, user };
  }

  #isAuthTokenCookieName(name: string): boolean {
    return name.startsWith('sb-') && name.includes('auth-token');
  }

  async #fetchAuthTokensFromChromeCookies(): Promise<SupabaseAuthTokens> {
    const cookies = await chrome.cookies.getAll({ url: getHost() });
    const authCookies = cookies.filter((cookie) => this.#isAuthTokenCookieName(cookie.name));
    ALogger.info({ context: 'authCookies found', stack: 'UserSessionService', authCookies });

    if (authCookies.length < 1) return null;

    const authTokens = this.#getAuthTokensFromAuthCookies(authCookies);
    if (!authTokens || !authTokens.accessToken || !authTokens.refreshToken) return null;
    return authTokens;
  }

  async #updateAuthTokensInChromeCookies(authTokens: SupabaseAuthTokens) {
    if (!authTokens) throw new Error('Invalid auth tokens');
    const { name, accessToken, refreshToken } = authTokens;
    const url = getHost();

    const raw = await chrome.cookies.get({ url, name });
    if (!raw) throw new Error('Cookie not found');
    const decoded = decodeURIComponent(raw.value);
    const cookieArray = decoded.length < 1 ? [] : JSON.parse(decoded);
    if (cookieArray[0] === accessToken && cookieArray[1] === refreshToken) return;

    cookieArray[0] = accessToken;
    cookieArray[1] = refreshToken;
    const value = encodeURIComponent(JSON.stringify(cookieArray));
    await chrome.cookies.set({ url, name, value });
  }

  #getAuthTokensFromAuthCookies(cookies: chrome.cookies.Cookie[]): SupabaseAuthTokens {
    let decoded = decodeURIComponent(cookies[0].value); // When there is only 1 cookie
    let cookieName = cookies[0].name;
    if (cookies.length > 1) {
      cookieName = cookies[0].name.split('.')[0]; // Supabase split large auth cookie, and name them something like sb-1-auth-token.0, sb-1-auth-token.1, etc.,

      const cookieValues = new Array(cookies.length);
      for (const cookie of cookies) {
        const index = parseInt(cookie.name.split('.')[1], 10);
        cookieValues[index] = cookie.value;
      }
      let cookieString = '';
      for (const cookieValue of cookieValues) {
        cookieString = cookieString + cookieValue;
      }
      decoded = decodeURIComponent(cookieString);
    }

    const cookieValueArray = decoded.length < 1 ? [] : JSON.parse(decoded);
    const { access_token: accessToken, refresh_token: refreshToken } = cookieValueArray;
    return { name: cookieName, accessToken, refreshToken } as SupabaseAuthTokens;
  }
}
