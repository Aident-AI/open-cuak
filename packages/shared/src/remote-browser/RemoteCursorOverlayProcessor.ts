import sharp from 'sharp';
import { ALogger } from '~shared/logging/ALogger';
import {
  RemoteCursorFocusCircleSize,
  RemoteCursorPositionCenterOffset,
  RemoteCursorSize,
  RemoteCursorTypeToBase64,
} from '~shared/remote-browser/RemoteCursor';

const getCleanBase64 = (base64: string) => base64.replace(/^data:image\/\w+;base64,/, '');

export class RemoteCursorOverlayProcessor {
  static async genCursorOverlayBufferFromBuffer(
    backgroundBuffer: Buffer,
    overlayOffset: { x: number; y: number },
    cursorType: string,
    overlayBuffer?: Buffer,
  ): Promise<Buffer> {
    try {
      let cursorBuffer = overlayBuffer;
      if (!cursorBuffer) {
        const base64 = RemoteCursorTypeToBase64[cursorType] || RemoteCursorTypeToBase64.default;
        cursorBuffer = Buffer.from(getCleanBase64(base64), 'base64');
      }

      const resizedCursorBuffer = await sharp(cursorBuffer)
        .ensureAlpha()
        .resize(RemoteCursorSize, RemoteCursorSize)
        .toBuffer();

      // Create a circular background for the cursor with updated colors
      const circleBuffer = await sharp({
        create: {
          width: RemoteCursorFocusCircleSize,
          height: RemoteCursorFocusCircleSize,
          channels: 4,
          background: { r: 63, g: 131, b: 248, alpha: 1 }, // You can adjust if needed
        },
      })
        .ensureAlpha()
        .composite([
          {
            input: Buffer.from(
              `<svg width="${RemoteCursorFocusCircleSize}" height="${RemoteCursorFocusCircleSize}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${RemoteCursorFocusCircleSize / 2}" cy="${RemoteCursorFocusCircleSize / 2}" r="${RemoteCursorFocusCircleSize / 2}" fill="rgba(35, 56, 118, 0.5)"/>
              </svg>`,
            ),
            blend: 'dest-in',
          },
        ])
        .png()
        .toBuffer();

      const cursorCenterOffset = RemoteCursorPositionCenterOffset[cursorType || 'default'];
      const finalBuffer = await sharp(backgroundBuffer)
        .ensureAlpha()
        .composite([
          {
            input: circleBuffer,
            top: overlayOffset.y - RemoteCursorFocusCircleSize / 2,
            left: overlayOffset.x - RemoteCursorFocusCircleSize / 2,
          },
          {
            input: resizedCursorBuffer,
            top: overlayOffset.y + cursorCenterOffset.y,
            left: overlayOffset.x + cursorCenterOffset.x,
          },
        ])
        .png()
        .toBuffer();

      return finalBuffer;
    } catch (error) {
      ALogger.error({
        context: 'RemoteCursor.genCursorOverlay',
        error,
        cursorType,
        position: overlayOffset,
      });
      throw error;
    }
  }

  static async genCursorOverlayFromBase64(
    backgroundBase64: string,
    overlayOffset: { x: number; y: number },
    cursorType: string,
    overlayBase64?: string,
  ): Promise<string> {
    try {
      const screenshotBuffer = Buffer.from(getCleanBase64(backgroundBase64), 'base64');
      let overlayBuffer = undefined;
      if (overlayBase64) {
        overlayBuffer = Buffer.from(getCleanBase64(overlayBase64), 'base64');
      }
      const finalBuffer = await this.genCursorOverlayBufferFromBuffer(
        screenshotBuffer,
        overlayOffset,
        cursorType,
        overlayBuffer,
      );
      return finalBuffer.toString('base64');
    } catch (error) {
      ALogger.error({
        context: 'RemoteCursor.genCursorOverlayFromBase64',
        error,
        cursorType,
        position: overlayOffset,
      });
      throw error;
    }
  }
}
