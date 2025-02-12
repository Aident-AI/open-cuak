import * as dotenv from 'dotenv';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { ALogger } from '~shared/logging/ALogger';
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
      const { data: rows, error } = await supabase
        .from('mock_users')
        .select('uuid')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!rows || rows.length < 1) {
        // eslint-disable-next-line no-console
        console.error('No mock user found in the database.');
        throw new Error(' Go to here to create one: http://localhost:3000/dev/save-mock-user');
      }

      const mockUserUuid = rows[0].uuid;
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
