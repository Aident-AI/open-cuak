import { Session, SupabaseClient, User } from '@supabase/supabase-js';

export class MockSupabaseUser {
  public static email = 'mock-user@aident.ai';
  public static password = 'SecurePassword123!';

  public static async genLoginMockUser(supabase: SupabaseClient): Promise<{ user: User; session: Session }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: this.email, password: this.password });
    if (error) throw error;
    return data;
  }
}
