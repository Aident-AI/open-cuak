'use server';

import { Attachment } from 'ai';
import { v4 as UUID } from 'uuid';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { ALogger } from '~shared/logging/ALogger';
import { SupabaseClientForServer } from '~shared/supabase/client/SupabaseClientForServer';

export const genSaveScreenshot = async (base64DataString: string): Promise<Attachment> => {
  await ALogger.genInit(UUID(), ExecutionEnvironment.WEB_SERVER_ACTION);

  try {
    const base64Data = base64DataString.split(',')[1];
    const blob = Buffer.from(base64Data, 'base64');
    const fileName = `screenshots/${UUID()}.png`;
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET_NAME_LABELED_DATA;
    if (!bucketName) throw new Error('No bucket name found in the environment variables.');

    const supabase = SupabaseClientForServer.createServiceRole();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, blob, { contentType: 'image/png', upsert: true });
    if (error || !data) throw new Error(`Failed to save data to supabase storage: ${error.message || 'unknown error'}`);
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return { name: fileName, contentType: 'image/png', url: publicUrl };
  } catch (error) {
    ALogger.error('Error saving screenshot:', error);
    throw error;
  }
};
