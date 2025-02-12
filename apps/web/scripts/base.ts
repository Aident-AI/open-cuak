import * as dotenv from 'dotenv';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { ALogger } from '~shared/logging/ALogger';
import { MockSupabaseUser } from '~shared/supabase/MockSupabaseUser';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export interface ExecScriptConfig {
  envPath?: string;
  skipMockUser?: boolean;
}

export const execScript = async (script: () => Promise<void>, config: ExecScriptConfig = {}) => {
  try {
    dotenv.config({ path: config.envPath ?? `.env` });
    await ALogger.genInit(undefined, ExecutionEnvironment.SCRIPTS);

    const supabase = SupabaseClientForServer.createServiceRole();
    if (!config.skipMockUser) {
      const { user: mockUser } = await MockSupabaseUser.genLoginMockUser(supabase);
      const mockUserUuid = mockUser.id;
      if (!mockUserUuid || mockUserUuid.length < 1) throw new Error('No mock user found in the database.');
    }

    ApiRequestContextService.initWithSupabaseClient({
      supabase,
      mockUserUuid: undefined,
      requestId: 'script-request-id',
    });

    // Run the script
    await script();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    await ALogger.close();
    process.exit();
  }
};

export const importDynamic = new Function('modulePath', 'return import(modulePath)');
