import { NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs'; // consider migrating to 'edge' runtime

const requestSchema = z.any();

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: false },
  async () => {
    return new NextResponse(JSON.stringify({ message: 'pong', env: process.env.NEXT_PUBLIC_BUILD_ENV }));
  },
);
