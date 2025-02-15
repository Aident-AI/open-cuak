import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

const requestSchema = z.object({ base64: z.string() });
const responseSchema = z.object({ width: z.number(), height: z.number(), format: z.string() });

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: false },
  async (request) => {
    try {
      const buffer = Buffer.from(request.base64, 'base64');
      const metadata = await sharp(buffer).metadata();

      const body = responseSchema.parse({
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
      });
      return new NextResponse(JSON.stringify(body), { status: 200 });
    } catch (error) {
      return new NextResponse(JSON.stringify({ error: 'Error processing images' }), { status: 500 });
    }
  },
);
