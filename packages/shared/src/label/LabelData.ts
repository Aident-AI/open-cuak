import { Database } from '~shared/schema.gen';

export type LabelData = Database['public']['Tables']['label_data']['Row'];

export type LabelDataWithAttachmentUrls = { data: LabelData; attachmentUrls: string[] };
