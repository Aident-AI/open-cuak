import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ALogger } from '~shared/logging/ALogger';
import { RuntimeMessageResponseSchema, RuntimeMessageSchema } from '~shared/messaging/types';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

const requestSchema = z.object({
  message: RuntimeMessageSchema.describe('The runtime message to be sent to the remote browser session.'),
});

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: true, allowServiceRole: true },
  async (request, context) => {
    const { message } = request;

    const rsp = await context.sendRuntimeMessage(message);
    const response = RuntimeMessageResponseSchema.parse(rsp);
    if (!response.success) {
      ALogger.error({ context: 'Failed to send runtime message', message, error: response.error });
      throw new Error(response.error);
    }

    return new NextResponse(JSON.stringify(response.data));
  },
);
