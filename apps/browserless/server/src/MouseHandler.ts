import { CDPSession, Page } from 'puppeteer-core';
import { Socket } from 'socket.io';
import { RemoteBrowserConnection } from '~browserless/server/src/RemoteBrowserConnection';
import { BroadcastEventType } from '~shared/broadcast/types';
import { ALogger } from '~shared/logging/ALogger';
import { RemoteCursorPosition, RemoteCursorPositionSchema } from '~shared/portal/RemoteBrowserTypes';

export class MouseHandler {
  public static async genSetupMousePositionListener(getConnection: () => RemoteBrowserConnection): Promise<void> {
    const { sessionId, page } = getConnection();
    const cdp = await page.createCDPSession();
    const setupMouseTracking = async (page: Page, cdp: CDPSession) => {
      await cdp.send('Runtime.addBinding', { name: 'reportMousePosition' });
      await page.evaluateOnNewDocument(`
        window.addEventListener('message', (event) => {
          if (event.source !== window) return;
          if (!event.data) throw new Error('No data in message');
          const data = JSON.parse(event.data);
          if (data?.type !== 'mousePositionRequest') throw new Error('Unknown message type');
          if (!data.payload) throw new Error('No payload in message');
          window.reportMousePosition(JSON.stringify(data.payload));
        });
      `);
    };
    await setupMouseTracking(page, cdp);
    page.on('framenavigated', async (frame) => {
      if (frame !== page.mainFrame()) return;
      await setupMouseTracking(page, cdp);
    });
    cdp.on('Runtime.bindingCalled', async (data) => {
      try {
        const payload = JSON.parse(data.payload);
        const event = RemoteCursorPositionSchema.parse(payload);
        const socket = getConnection().socket;
        if (!socket) throw new Error('Socket not found');
        socket.emit('cursor-update', { sessionId, position: event });
      } catch (error) {
        ALogger.error('Error handling mouse tracking binding:', error);
      }
    });
  }

  public static async genHandleCursorTracking(
    connection: RemoteBrowserConnection,
    socket: Socket,
    sessionId: string,
    position: RemoteCursorPosition,
  ): Promise<void> {
    const { browser, page, tabId } = connection;

    try {
      const element = await page.evaluateHandle((x, y) => document.elementFromPoint(x, y), position.x, position.y);
      const cursorStyle = await page.evaluate((el) => {
        if (!el) return 'default';
        return window.getComputedStyle(el as Element).cursor;
      }, element);

      const updatedPosition = { ...position, cursor: cursorStyle ?? 'default', ts: Date.now(), tabId };
      const broadcastEvent = { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId };

      await browser.genSendBroadcastEvent(broadcastEvent, RemoteCursorPositionSchema.parse(updatedPosition)),
        await page.mouse.move(position.x, position.y);
      switch (position.event) {
        case 'mousedown':
          await page.mouse.down();
          break;
        case 'mouseup':
          await page.mouse.up();
          break;
        case 'mousemove':
          // do nothing
          break;
        default:
          throw new Error(`Unknown event: ${position.event}`);
      }
      await element.dispose();
    } catch (error) {
      console.error(`Failed to broadcast cursor position for connection ${sessionId}:`, error);
      socket.emit('error', { message: 'Failed to broadcast cursor position' });
      socket.disconnect(true);
    }
  }

  public static async genGetCursorPosition(connection: RemoteBrowserConnection): Promise<RemoteCursorPosition | null> {
    const { browser, tabId } = connection;

    const event = { type: BroadcastEventType.MOUSE_POSITION_UPDATED, identifier: tabId };
    const position = await browser.genFetchExtensionBroadcastEvent<object>(event);
    if (!position) return null;
    return RemoteCursorPositionSchema.parse(position);
  }
}
