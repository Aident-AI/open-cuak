import { execScript } from '~scripts/base';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

execScript(
  async () => {
    const supabaseAdmin = SupabaseClientForServer.createServiceRole();
    const buckets = [
      process.env.SUPABASE_STORAGE_BUCKET_NAME_LABELED_DATA,
      process.env.SUPABASE_STORAGE_BUCKET_NAME_SAVE_TO_NEO4J,
    ];

    for (const bucketName of buckets) {
      if (!bucketName) throw new Error('No bucket name found in the environment variables.');
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) throw listError;
      const bucketExists = buckets.some((bucket) => bucket.name === bucketName);
      if (bucketExists) {
        ALogger.info({ context: 'bucket already exists. skip.', bucketName });
        continue;
      }

      ALogger.info({ context: 'creating bucket', bucketName });
      const { data, error } = await supabaseAdmin.storage.createBucket(bucketName);
      if (error) throw error;
      ALogger.info({ context: 'bucket created', data });
    }
  },
  { skipMockUser: true, envPath: process.argv.slice(2)[0] === '--prod' ? '.env.production' : '.env' },
);
