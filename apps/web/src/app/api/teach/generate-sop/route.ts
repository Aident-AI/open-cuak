import { NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';
import { TeachAidenDataSchema } from '~src/app/portal/TeachAidentData';

const requestSchema = z.object({
  teachAidenDataMap: z.record(z.string().transform(Number), TeachAidenDataSchema),
});

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: true },
  async (request) => {
    const { teachAidenDataMap } = request;

    // TODO plug in llm to generate sop
    const response = { success: true, data: Object.keys(teachAidenDataMap).length };

    return new NextResponse(JSON.stringify(response));
  },
);
