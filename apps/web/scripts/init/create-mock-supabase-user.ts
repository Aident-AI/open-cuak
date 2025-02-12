import { execScript } from '~scripts/base';
import { ALogger } from '~shared/logging/ALogger';
import { MockSupabaseUser } from '~shared/supabase/MockSupabaseUser';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

execScript(
  async () => {
    const supabaseAdmin = SupabaseClientForServer.createServiceRole();

    // the first user should be the mock user, as it is one of the init steps
    const { data: existingData, error: existingError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (existingError) throw existingError;
    const mockUserExisting = existingData.users.some((user) => user.email === MockSupabaseUser.email);
    if (mockUserExisting) {
      ALogger.info({ context: '✅ Mock user already exists' });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'mock-user@aident.ai',
      password: 'SecurePassword123!',
      email_confirm: true,
    });
    if (error) ALogger.error({ error });
    else ALogger.info({ context: 'Mock user created', data });
  },
  { skipMockUser: true },
);
