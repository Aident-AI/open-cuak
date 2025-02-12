'use server';

import { BaseApiSchemaRoute } from '~src/app/api-schema/BaseApiSchemaRoute';
import { BrowserActionApiSpec } from '~src/app/api/extension/browser/BrowserActionApiSpec';

export const GET = BaseApiSchemaRoute(new BrowserActionApiSpec().apiSpec);
