import { RealtimeChannel, SupabaseClient, createClient } from '@supabase/supabase-js';
import { BroadcastEventType } from '~shared/broadcast/types';
import { getDockerFriendlyUrl } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { RequestId } from '~shared/logging/RequestId';
import { RuntimeMessageReceiver } from '~shared/messaging/RuntimeMessageReceiver';
import { EVENT_CHANNEL_NAME_PREFIX, SupabaseChannelEvent } from '~shared/supabase/SupabaseChannelEvent';
import { BroadcastService } from '~src/common/services/BroadcastService';
import { UserSessionService } from '~src/common/services/UserSessionService';
import { ServiceWorkerMessageHandler } from '~src/scripts/service-worker/message/ServiceWorkerMessageHandler';

export class SupabaseService {
  public static async start() {
    if (!this.#instance) this.#instance = new SupabaseService();

    UserSessionService.onChange(async (userSession) => {
      const userId = userSession?.user?.id;
      if (!userId) return;

      this._instance.#closeRealtimeChannel();
      this._instance.#initRealtimeChannel(userId);
    });
    BroadcastService.subscribeType<string>(BroadcastEventType.EXEC_SESSION_ID, async (_, execSessionId) => {
      RequestId.set(execSessionId);
      ALogger.info({ context: 'got exec-session-id', execSessionId });
      if (!execSessionId) return;

      this._instance.#closeRealtimeChannel();
      this._instance.#initRealtimeChannel(execSessionId);
    });
  }

  public static get client() {
    return this._instance.#client;
  }

  static #instance: SupabaseService | null = null;

  private static get _instance() {
    if (!this.#instance) this.#instance = new SupabaseService();
    return this.#instance;
  }

  private constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      throw new Error('Supabase env vars are not properly defined.');
    this.#client = createClient(
      getDockerFriendlyUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }

  #client: SupabaseClient;
  #realtimeChannel: RealtimeChannel | null = null;

  #initRealtimeChannel(channelTarget: string) {
    try {
      this.#realtimeChannel = this.#client.channel(EVENT_CHANNEL_NAME_PREFIX + channelTarget);
      const sendStageResult = async (stage: 'ack' | 'response', targetEventId: string, payload: unknown) => {
        const event = stage + ':' + targetEventId;
        const rsp = await this.#realtimeChannel!.send({ type: 'broadcast', event, payload } as SupabaseChannelEvent);
        if (rsp !== 'ok') ALogger.error({ context: 'failed to send response to channel', targetEventId, rsp });
      };
      const processEvent = async (event: SupabaseChannelEvent): Promise<void> => {
        ALogger.info({ context: 'Processing channel event', stack: 'SupabaseService', event });
        const { payload: message, expectResponse } = SupabaseChannelEvent.RuntimeMessage.RequestSchema.parse(event);

        // TODO: check why `sendRuntimeMessage` breaks here. current hack to use `ServiceWorkerMessageHandler.processMessage` directly.
        if (message.receiver !== RuntimeMessageReceiver.SERVICE_WORKER)
          throw new Error('Only service worker messages are supported for now.');
        const response = await ServiceWorkerMessageHandler.processMessage(message);

        if (!expectResponse) return;

        await sendStageResult('response', event.eventId, response);

        // sanitize base64 for logging
        if (response && response.success && response.data && 'base64' in response.data)
          response.data.base64 = '[skipped-base64]';
        ALogger.info({ context: 'Sent response to channel', stack: 'SupabaseService', response });
      };

      this.#realtimeChannel
        .on('broadcast', { event: 'broadcast' }, async (e: unknown) => {
          try {
            const event = e as SupabaseChannelEvent;
            if (!('eventId' in event)) throw new Error('[SupabaseService] eventId is not defined');
            const { eventId } = event;
            if (!eventId) throw new Error('[SupabaseService] eventId is not defined');
            ALogger.info({ context: 'Received channel event, sending ack', stack: 'SupabaseService', eventId });

            await sendStageResult('ack', eventId, null);
            await processEvent(event);
          } catch (error) {
            ALogger.error({ stack: 'SupabaseService', error });
          }
        })
        .subscribe();
      ALogger.info({ context: 'Realtime channel initialized.', stack: 'SupabaseService', sessionId: channelTarget });
    } catch (error) {
      ALogger.error({ context: 'Failed to initialize realtime channel', stack: 'SupabaseService', error });
    }
  }

  #closeRealtimeChannel() {
    if (!this.#realtimeChannel) return;

    this.#client.removeChannel(this.#realtimeChannel);
    this.#realtimeChannel = null;
  }
}
