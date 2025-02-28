import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RemoteCursorOverlayProcessor } from '~shared/remote-browser/RemoteCursorOverlayProcessor';
import { simpleRequestWrapper } from '~src/app/api/simpleRequestWrapper';

const requestSchema = z
  .object({
    backgroundBase64: z.string(),
    cursorType: z.string().optional(),
    overlayBase64: z.string().optional(),
    overlayOffset: z.object({ x: z.number(), y: z.number() }),
  })
  .refine((data) => !!data.cursorType !== !!data.overlayBase64, {
    message: 'Exactly one of cursorType or overlayBase64 must be provided',
    path: ['cursorType', 'overlayBase64'],
  });

export const POST = simpleRequestWrapper<z.infer<typeof requestSchema>>(
  requestSchema,
  { assertUserLoggedIn: false },
  async (request) => {
    try {
      const base64 = await RemoteCursorOverlayProcessor.genCursorOverlayFromBase64(
        request.backgroundBase64,
        request.overlayOffset,
        request.cursorType || 'default',
        request.overlayBase64,
      );
      return new NextResponse(JSON.stringify({ base64 }), { status: 200 });
    } catch (error) {
      return new NextResponse(JSON.stringify({ error: 'Error processing images' }), { status: 500 });
    }
  },
);
