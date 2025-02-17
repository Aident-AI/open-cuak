import * as dotenv from 'dotenv';
import http from 'http';
import { KeyInput } from 'puppeteer-core';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { BrowserConnectionData, ConnectionManager } from '~browserless/server/src/ConnectionManager';
import { MouseHandler } from '~browserless/server/src/MouseHandler';
import { ScreencastHandler } from '~browserless/server/src/ScreencastHandler';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { isDevelopment } from '~shared/env/environment';
import { ALogger } from '~shared/logging/ALogger';
import { RemoteCursorPosition } from '~shared/portal/RemoteBrowserTypes';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

dotenv.config({ path: '/app/' + (isDevelopment() ? '.env' : '.env.production') });

const WEBSOCKET_PORT = 50000;

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string | undefined;
  };
}

ALogger.genInit(undefined, ExecutionEnvironment.BROWSERLESS_WS_SERVER);

const server = http.createServer();
const io = new SocketIOServer(server, {
  cors: { origin: ['http://localhost:3000', 'https://app.aident.ai'], methods: ['GET', 'POST'] },
});

io.use(async (socket: AuthenticatedSocket, next) => {
  try {
    const { token, serviceToken } = socket.handshake.auth;
    if (serviceToken) {
      if (!process.env.BROWSERLESS_SERVICE_ROLE_TOKEN) throw new Error('Browserless service role token is not set');
      if (serviceToken !== process.env.BROWSERLESS_SERVICE_ROLE_TOKEN) {
        console.log({ serviceToken, expectedServiceToken: process.env.BROWSERLESS_SERVICE_ROLE_TOKEN });
        throw new Error('Authentication error: Invalid service token');
      }
      socket.user = { id: serviceToken, email: 'admin@aident.ai' };
      console.log('Authentication successful as service-role');
      next();
      return;
    }
    if (!token) {
      console.log('Authentication failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    const supabase = SupabaseClientForServer.createAnonymous();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error) {
      console.log('Supabase auth error:', error);
      return next(new Error('Authentication error: service error'));
    }
    if (!user) {
      console.log('No user found for token');
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.user = { id: user.id, email: user.email };
    console.log('Authentication successful for user:', user.id);
    next();
  } catch (error) {
    console.error('Failed to authenticate.', error);
    next(new Error('Connection Failure'));
  }
});

const connectionManager = new ConnectionManager();

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log(`New client connected: ${socket.id} with origin: ${socket.handshake.headers.origin}`);

  socket.on('disconnect', async () => {
    console.log(`Client disconnected: ${socket.id}`);
    const connection = connectionManager.getConnectionBySocket(socket);
    if (connection) {
      connection.detachSocketFromConnection();
      if (!connection.keepAlive) await connectionManager.genCloseConnection(connection.sessionId);
    }
  });

  socket.on('connect-browser', async (data: BrowserConnectionData) => {
    const { sessionId } = data;

    let connection = connectionManager.getConnectionBySessionId(sessionId);
    if (!connection) {
      if (data.resumeOnly) {
        socket.emit('browser-session-not-found', { sessionId });
        return;
      }

      // No connection found, create a new one
      try {
        await connectionManager.genConnectBrowser(socket, data);
        socket.emit('browser-session', { sessionId, status: 'New websocket session and browser connection' });
      } catch (error) {
        console.error('Failed to connect to browser:', error);
        socket.emit('error', { message: 'Failed to connect to browser.' });
      }
      return;
    }

    // Connection found, attach the socket to the connection
    connection.socket = socket;
    const browser = connection.browser;
    if (browser.puppeteerBrowser.connected) {
      socket.emit('browser-session', {
        sessionId: sessionId,
        status: 'Existing browser connection with an active instance',
      });
    } else {
      await connectionManager.genConnectBrowser(socket, data);
      socket.emit('browser-session', {
        sessionId: sessionId,
        status: 'Existing browser connection with a renewed instance',
      });
    }
  });

  socket.on('enable-interaction-events', async (data: { sessionId: string }) => {
    const { sessionId } = data;
    if (!sessionId) return;

    try {
      const connection = connectionManager.getConnectionBySessionId(sessionId);
      if (!connection) throw new Error('Connection not found');
      connection.enableInteractionEvents = true;
    } catch (error) {
      ALogger.error({ context: 'Failed to enable interaction events:', error });
      socket.emit('error', { message: 'Failed to enable interaction events' });
    }
  });

  socket.on('disable-interaction-events', async (data: { sessionId: string }) => {
    const { sessionId } = data;
    if (!sessionId) return;

    try {
      const connection = connectionManager.getConnectionBySessionId(sessionId);
      if (!connection) throw new Error('Connection not found');
      connection.enableInteractionEvents = false;
    } catch (error) {
      ALogger.error({ context: 'Failed to disable interaction events:', error });
      socket.emit('error', { message: 'Failed to disable interaction events' });
    }
  });

  socket.on('get-tabs', async (data: BrowserConnectionData) => {
    const { sessionId } = data;
    if (!sessionId) return;

    try {
      const connection = connectionManager.getConnectionBySessionId(sessionId);
      if (!connection) throw new Error('Connection not found');
      socket.emit('all-tabs', { tabs: await connection.genAllTabs() });
      socket.emit('active-tab-id', { tabId: connection.getActiveTabId() });
    } catch (error) {
      ALogger.error({ context: 'Failed to get tabs:', error });
      socket.emit('error', { message: 'Failed to get tabs' });
    }
  });

  socket.on('switch-tab', async (data: { sessionId: string; tabId: number }) => {
    const { sessionId, tabId } = data;
    if (!sessionId) return;
    const connection = connectionManager.getConnectionBySessionId(sessionId);
    if (!connection) throw new Error('Connection not found');
    connection.switchTab(tabId);
  });

  socket.on('close-tab', async (data: { sessionId: string; tabId: number }) => {
    const { sessionId, tabId } = data;
    if (!sessionId) return;
    const connection = connectionManager.getConnectionBySessionId(sessionId);
    if (!connection) throw new Error('Connection not found');
    const nextTabId = await connection.removeTabAndSwitchToNext(tabId);
    socket.emit('all-tabs', { tabs: await connection.genAllTabs() });
    socket.emit('active-tab-id', { tabId: nextTabId });
  });

  socket.on('close-browser', async (data: BrowserConnectionData) => {
    const { sessionId } = data;
    if (!sessionId) return;

    ALogger.info(`Closing browser for sessionId: ${sessionId}`);
    await connectionManager.genCloseConnection(sessionId);
    console.log(`Browser disconnected, sessionId: ${sessionId}`);
  });

  socket.on('start-screencast', async (data: BrowserConnectionData) => {
    const { sessionId } = data;
    if (!sessionId) return;

    try {
      const connection = connectionManager.getConnectionBySessionId(sessionId);
      if (!connection) throw new Error('Connection not found');
      await ScreencastHandler.genStartScreencast(connection);
      console.log(`Screencast started for connection: ${sessionId}`);
    } catch (error) {
      console.error('Failed to start screencast:', error);
      socket.emit('error', { message: 'Failed to start screencast' });
    }
  });

  socket.on('stop-screencast', async (data: BrowserConnectionData) => {
    const { sessionId } = data;
    if (!sessionId) return;

    try {
      const connection = connectionManager.getConnectionBySessionId(sessionId);
      if (!connection) throw new Error('Connection not found');
      await ScreencastHandler.genStopScreencast(connection);
      console.log(`Screencast stopped for connection: ${sessionId}`);
    } catch (error) {
      console.error('Failed to stop screencast:', error);
      socket.emit('error', { message: 'Failed to stop screencast' });
    }
  });

  socket.on('remote-cursor-position', async (data: { sessionId: string; position: RemoteCursorPosition }) => {
    const { sessionId, position } = data;
    if (!sessionId) return;

    try {
      const connection = connectionManager.getConnectionBySessionId(sessionId);
      if (!connection) throw new Error('Connection not found');

      await MouseHandler.genHandleCursorTracking(connection, socket, sessionId, position);
      if (!connection?.enableInteractionEvents) return;
      socket.emit('interaction-event', { type: 'mouse', data, ts: Date.now() });
    } catch (error) {
      socket.emit('error', { message: 'Failed to handle cursor tracking' });
    }
  });

  socket.on('keyboard-event', async (data: { sessionId: string; event: string; key: KeyInput }) => {
    const { sessionId } = data;
    if (!sessionId) return;
    try {
      const page = await connectionManager.genEnsurePageIsActive(sessionId);
      const connection = connectionManager.getConnectionBySessionId(sessionId);

      switch (data.event) {
        case 'keydown':
          await page.keyboard.down(data.key);
          break;
        case 'keyup':
          await page.keyboard.up(data.key);
          break;
      }

      if (connection?.enableInteractionEvents)
        socket.emit('interaction-event', { type: 'keyboard', data, ts: Date.now() });
    } catch (error) {
      socket.emit('error', { message: 'Failed to process keyboard event' });
    }
  });

  socket.on('wheel-event', async (data: { sessionId: string; deltaX: number; deltaY: number }) => {
    const { sessionId, deltaX, deltaY } = data;
    if (!sessionId) return;
    try {
      const page = await connectionManager.genEnsurePageIsActive(sessionId);
      const connection = connectionManager.getConnectionBySessionId(sessionId);

      await page.mouse.wheel({ deltaX, deltaY });
      if (connection?.enableInteractionEvents)
        socket.emit('interaction-event', { type: 'wheel', data, ts: Date.now() });
    } catch (error) {
      socket.emit('error', { message: 'Failed to process wheel event' });
    }
  });
});

server.listen(WEBSOCKET_PORT, () => {
  console.log(`WebSocket server is running on port ${WEBSOCKET_PORT}`);
});
