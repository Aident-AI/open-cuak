import { NextResponse } from 'next/server';
import { withRequestLogging } from '~src/_logging/withRequestLogging';
import { ExtensionApiSpec } from '~src/app/api/extension/ExtensionApiSpec';

export const GET = withRequestLogging(
  async (): Promise<NextResponse> => NextResponse.json(new ExtensionApiSpec().getFunctionCallDefinition()),
);
