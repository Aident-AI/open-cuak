'use server';

import { BaseApiSchemaRoute } from '~src/app/api-schema/BaseApiSchemaRoute';
import { ExtensionApiSpec } from '~src/app/api/extension/ExtensionApiSpec';

export const GET = BaseApiSchemaRoute(new ExtensionApiSpec().apiSpec);
