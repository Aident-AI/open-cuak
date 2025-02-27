import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import PgBoss from 'pg-boss';
import { UserConfig, UserConfigData } from '~shared/export-map.generated';
import { ApiRequestContext } from '~shared/http/ApiRequestContext';
import { ALogger } from '~shared/logging/ALogger';
import { ServiceWorkerMessageAction } from '~shared/messaging/service-worker/ServiceWorkerMessageAction';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';
import { getRequestContext } from '~src/_logging/RequestContext';
import { RemoteExtensionService } from '~src/app/api/extension/RemoteExtensionService';

export interface ApiRequestContextInitOptions {
  supabase: SupabaseClient;

  execSessionIdOverride?: string;
  mockUserUuid?: string;
  req?: NextRequest;
  requestId?: string;
}

export class ApiRequestContextService {
  public static initInRoutes(req: NextRequest): ApiRequestContext {
    try {
      const supabase = SupabaseClientForServer.createForRouteHandler();
      const context = this.initWithSupabaseClient({ supabase, req });
      return context;
    } catch (error) {
      ALogger.error({ stack: 'ApiRequestContextService:initInRoutes', error });
      throw error;
    }
  }

  public static initWithSupabaseClient(options: ApiRequestContextInitOptions): ApiRequestContext {
    this.reset();

    const requestId = options.req?.headers.get('x-request-id') ?? options.requestId;
    if (!requestId) throw new Error('Request ID not found in init.');

    this.#supabase = options.supabase;
    this.#context = {
      fetchSession: async (): Promise<Session | null> => {
        if (this.#session) return this.#session;

        const supabase = this.getContext().getSupabase();
        let session: Session | null = null;

        const authToken = options.req?.headers.get('Authorization');
        if (authToken) {
          // expect auth token to be a json object with `accessToken` and `refreshToken`
          const authTokens = JSON.parse(authToken.replace('Bearer ', ''));
          const { accessToken, refreshToken } = authTokens;
          if (!accessToken || !refreshToken) {
            ALogger.error({ stack: 'ApiRequestContextService', context: 'Invalid auth token' });
            throw new Error('Invalid auth token.');
          }
          const authRsp = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (authRsp.error) {
            ALogger.error({ stack: 'ApiRequestContextService', context: 'Supabase auth failed' });
            throw authRsp.error;
          }
          if (authRsp.data?.session) session = authRsp.data.session;
        }

        if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }

        if (!session) return null;
        this.#session = session;
        this.#user = session.user;
        return session;
      },
      fetchUser: async (): Promise<User | null> => {
        if (this.#user) return this.#user;
        const session = await this.getContext().fetchSession();
        if (!session?.user) return null;
        return session.user;
      },
      fetchUserOrThrow: async (): Promise<User> => {
        const user = await this.getContext().fetchUser();
        if (!user) throw new Error('User not logged in.'); // TODO: better error handling with error code (e.g. 401)
        return user;
      },
      fetchUserConfig: async (): Promise<UserConfigData> => {
        const user = await this.getContext().fetchUserOrThrow();
        const supabase = this.getContext().getSupabase();
        return await UserConfig.genFetch(user.id, supabase);
      },
      getBoss: (): PgBoss => {
        if (!process.env.PG_CONNECTION) throw new Error('PG_CONNECTION not set.');
        return new PgBoss({ connectionString: process.env.PG_CONNECTION, application_name: 'web-api', max: 1 });
      },
      getExecSessionId: (): string | undefined => options.execSessionIdOverride ?? getRequestContext().execSessionId,
      getRemoteBrowserSessionId: () => getRequestContext().remoteBrowserSessionId,
      getRequestId: () => requestId,
      getSupabase: () => {
        if (!this.#supabase) throw new Error('Supabase not initialized.');
        return this.#supabase;
      },
      sendRuntimeMessage: async (message: RuntimeMessage, targetChannel?: string): Promise<RuntimeMessageResponse> => {
        if (!this.#context) throw new Error('ApiRequestContextService not initialized.');
        const supabase = this.getContext().getSupabase();
        const channelTarget =
          targetChannel ??
          this.getContext().getRemoteBrowserSessionId() ??
          (await this.getContext().fetchUserOrThrow()).id;
        if (!channelTarget) throw new Error('Channel target not found.');
        this.getDebugLogger({ context: 'sendRuntimeMessage.start', channelTarget, message });
        const response = await RemoteExtensionService.sendRuntimeMessage(supabase, channelTarget, message);
        if (message.action === ServiceWorkerMessageAction.SCREENSHOT) {
          const rsp = { success: response.success, data: 'skipped' };
          this.getDebugLogger({ context: 'sendRuntimeMessage.response', channelTarget, message, response: rsp });
        } else {
          this.getDebugLogger({ context: 'sendRuntimeMessage.response', channelTarget, message, response });
        }
        return response;
      },
    };

    return this.getContext();
  }

  public static overrideSupabaseUsingServiceRole(): void {
    this.#supabase = SupabaseClientForServer.createServiceRole();
    ALogger.info({ context: 'ApiRequestContextService', message: 'Supabase client overridden using service role.' });
  }

  public static getContext(): ApiRequestContext {
    // TODO: support `BaseExtensionApiRoute`
    if (!this.#context) throw new Error('ApiRequestContextService not initialized.');
    return this.#context;
  }

  public static getDebugLogger(...meta: unknown[]) {
    return ALogger.debug(...meta);
  }

  public static reset(): void {
    this.#context = undefined;
    this.#session = null;
    this.#supabase = undefined;
    this.#user = null;
  }

  static #context?: ApiRequestContext = undefined;
  static #session: Session | null = null;
  static #supabase?: SupabaseClient;
  static #user: User | null = null;
}
