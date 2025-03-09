import { execScript } from '~scripts/base';
import { ALogger } from '~shared/logging/ALogger';
import { RemoteBrowserSocket } from '~shared/remote-browser/RemoteBrowserSocket';

/**
 * Script to kill all active remote browser sessions
 * Run with: npm run browserless:kill-all-sessions
 */
execScript(
  async () => {
    try {
      ALogger.info({ context: 'Starting script to kill all browser sessions' });

      // Use service role to ensure we have permission to kill all sessions
      const auth = { userSession: null, useServiceRole: true };

      // Kill all browser sessions
      RemoteBrowserSocket.killAllBrowserSessions(auth);

      ALogger.info({ context: 'Kill all sessions request sent successfully' });

      // Wait a moment for the socket connection to complete its work
      await new Promise((resolve) => setTimeout(resolve, 2000));

      ALogger.info({ context: 'Script completed' });
    } catch (error) {
      ALogger.error({ context: 'Failed to kill all browser sessions', error });
      process.exit(1);
    }
  },
  { skipMockUser: true },
);
