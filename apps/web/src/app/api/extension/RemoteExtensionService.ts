import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as UUID } from 'uuid';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessage, RuntimeMessageResponse } from '~shared/messaging/types';
import { EVENT_CHANNEL_NAME_PREFIX, SupabaseChannelEvent } from '~shared/supabase/SupabaseChannelEvent';
import { WaitUtils } from '~shared/utils/WaitUtils';

export class StageError extends Error {
  constructor(
    public stage: 'ack' | 'response',
    public eventId: string,
    public timeout: number,
    public channelTarget: string,
  ) {
    super(
      `[${stage.toUpperCase()}] stage timed out: eventId= ${eventId} timeout=${timeout} channelTarget=${channelTarget}`,
    );
  }
}

export class RemoteExtensionService {
  // TODO: force payload type assertion using `RuntimeMessage.RequestPayload`'s type or schema
  public static async sendRuntimeMessage<T>(
    supabase: SupabaseClient,
    channelTarget: string,
    message: RuntimeMessage,
  ): Promise<RuntimeMessageResponse> {
    const eventId = UUID();
    const userChannel = supabase.channel(EVENT_CHANNEL_NAME_PREFIX + channelTarget);

    const expectStageResult = <T>(stage: 'ack' | 'response', timeout: number) =>
      Promise.race([
        new Promise<T>((resolve) =>
          userChannel.on('broadcast', { event: stage + ':' + eventId }, (e) => resolve(e?.payload)),
        ),
        WaitUtils.delayToThrow(timeout, new StageError(stage, eventId, timeout, channelTarget)),
      ]);
    const stagedPromises = <T>(promises: Promise<unknown>[]) =>
      new Promise<T>((resolve, reject) => {
        const racers = promises.map((i) => i.catch(reject));
        racers[racers.length - 1].then((result) => resolve(result as T));
        Promise.race(racers);
      });
    const sendMessageAndWaitForResponse = (message: RuntimeMessage) =>
      new Promise<RuntimeMessageResponse>((resolve, reject) =>
        userChannel.subscribe(async (status) => {
          if (status !== 'SUBSCRIBED') return;

          const event = { type: 'broadcast', event: 'broadcast', eventId, payload: message, expectResponse: true };
          const realtimeResponse = await userChannel.send(event as SupabaseChannelEvent.RuntimeMessage.Request);
          if (realtimeResponse !== 'ok') reject(new Error('Failed to send service message: ' + realtimeResponse));

          try {
            const rsp = await stagedPromises<RuntimeMessageResponse>([
              expectStageResult('ack', 10_000),
              expectStageResult('response', Number(process.env.API_TIMEOUT) ?? 30_000),
            ]);
            resolve(rsp);
          } catch (error) {
            reject(error);
          }
        }),
      );

    let rtn: RuntimeMessageResponse;
    try {
      const rsp = await sendMessageAndWaitForResponse(message);
      if (!rsp.success) throw rsp.error;
      rtn = { success: true, data: rsp.data as T }; // force type assertion
    } catch (error) {
      ALogger.error({ context: 'RemoteExtensionService.sendRuntimeMessage catch', error });
      if (!(error instanceof StageError)) rtn = { success: false, error: (error as Error).message };
      else if (error.stage !== 'ack') rtn = { success: false, error: error.message };
      else rtn = { success: false, error: `Extension client cannot be reached. channel id: ${channelTarget}` };
    } finally {
      supabase.removeChannel(userChannel);
    }
    return rtn;
  }
}
