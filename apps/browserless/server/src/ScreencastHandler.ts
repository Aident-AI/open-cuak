import { MouseHandler } from '~browserless/server/src/MouseHandler';
import { RemoteBrowserConnection } from '~browserless/server/src/RemoteBrowserConnection';

export class ScreencastHandler {
  public static async genStopScreencast(connection: RemoteBrowserConnection): Promise<void> {
    const page = await connection.genEnsurePageIsActive();
    const cdp = await page.target().createCDPSession();
    await cdp.send('Page.stopScreencast');
  }

  public static async genStartScreencast(connection: RemoteBrowserConnection): Promise<void> {
    let retryCount = 0;
    const maxRetries = 3;

    const { socket, sessionId } = connection;
    if (!socket) throw new Error('Socket not found');

    const attempt = async () => {
      try {
        await this.#genSetupScreencastSession(connection);
      } catch (error) {
        console.error(`Screencast attempt ${retryCount + 1} failed:`, error);

        if (retryCount >= maxRetries) {
          socket.emit('error', { message: 'Failed to establish screencast after multiple attempts', sessionId });
          throw error;
        }

        retryCount++;
        console.log(`Retrying screencast (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        await attempt();
      }
    };

    await attempt();
  }

  static async #genSetupScreencastSession(connection: RemoteBrowserConnection): Promise<void> {
    const { socket, sessionId, userId } = connection;
    if (!socket) throw new Error('Socket not found');

    const page = await connection.genEnsurePageIsActive();
    const cdp = await page.target().createCDPSession();
    let isScreencastActive = true;

    socket.on('disconnect', () => {
      isScreencastActive = false;
      cdp.detach().catch(console.error);
    });

    cdp.on('Page.screencastFrame', async (frameObject) => {
      if (!isScreencastActive) return;

      try {
        const frame = { castSessionId: frameObject.sessionId, data: frameObject.data, metadata: frameObject.metadata };
        socket.emit('screencast-frame', { sessionId, frame });

        await cdp.send('Page.screencastFrameAck', { sessionId: frameObject.sessionId });
      } catch (error) {
        console.error('Error handling screencast frame:', error);
        isScreencastActive = false;
        await cdp.send('Page.stopScreencast');
      }
    });

    try {
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 100 });
    } catch (error) {
      console.error('Failed to start screencast:', error);
      isScreencastActive = false;
      socket.emit('error', { message: 'Failed to start screencast', sessionId });
    }

    const isEmpty = await page.evaluate(() => !document.body.textContent?.trim());
    if (isEmpty) {
      await page.goto('https://google.com');
    }
    console.log('Sending initial cursor position');
    const cursorPosition = await MouseHandler.genGetCursorPosition(connection);
    if (!cursorPosition) return;
    socket.emit('cursor-update', { sessionId, position: cursorPosition });
    console.log('Sent initial cursor position');
  }
}
