import { BroadcastService } from '~src/common/services/BroadcastService';

export class SessionStorageDebugger {
  public start() {
    BroadcastService.subscribeAll(async (event, value) => {
      // eslint-disable-next-line no-console
      console.debug(
        '[SessionStorageDebugger] Broadcast Received:',
        JSON.stringify(event),
        'value=',
        JSON.stringify(value),
      );
    });
  }
}
