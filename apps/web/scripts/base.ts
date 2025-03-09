import * as dotenv from 'dotenv';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';
import { ApiRequestContextService } from '~src/services/ApiRequestContextService';

export interface ExecScriptConfig {
  envPath?: string;
}

export const execScript = async (script: () => Promise<void>, config: ExecScriptConfig = {}) => {
  try {
    dotenv.config({ path: config.envPath || `.env` });
    await ALogger.genInit(undefined, ExecutionEnvironment.SCRIPTS);

    const supabase = SupabaseClientForServer.createServiceRole();
    ApiRequestContextService.initWithSupabaseClient({ supabase, requestId: 'script-request-id' });

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
