import { z } from 'zod';

export enum ShadowModeStatus {
  IDLE = 'idle',
  RECORDING = 'recording',
  ANALYZING = 'analyzing',
}

export const ShadowModeSessionMetaSchema = z.object({
  status: z.nativeEnum(ShadowModeStatus),
  sessionId: z.string().optional(),
});
export type ShadowModeSessionMeta = z.infer<typeof ShadowModeSessionMetaSchema>;

export class ShadowModeSession {
  public static init(sessionId?: string) {
    const status = !sessionId ? ShadowModeStatus.IDLE : ShadowModeStatus.RECORDING;
    const session = { status, sessionId };
    return new ShadowModeSession(session);
  }

  public static fromBroadcast(s: string) {
    if (!s) throw new Error('ShadowModeSession.fromBroadcast: invalid input');

    const meta = JSON.parse(s);
    if (!meta || typeof meta !== 'object' || Object.keys(meta).length < 1) {
      console.warn('ShadowModeSession.fromBroadcast: invalid meta', meta);
      return this.init();
    }

    const parsed = ShadowModeSessionMetaSchema.parse(meta);
    return new ShadowModeSession(parsed);
  }

  private constructor(data: ShadowModeSessionMeta) {
    this.#status = data.status;
    this.#sessionId = data.sessionId;
  }

  public get status() {
    return this.#status;
  }

  public get sessionId(): string {
    if (this.isIdle()) throw new Error('Session ID not available');
    if (!this.#sessionId) throw new Error('Unexpected missing session ID');

    return this.#sessionId;
  }

  public isIdle() {
    return this.#status === ShadowModeStatus.IDLE;
  }

  public isRecording() {
    return this.#status === ShadowModeStatus.RECORDING;
  }

  public isAnalyzing() {
    return this.#status === ShadowModeStatus.ANALYZING;
  }

  public toJSON() {
    return { status: this.#status, sessionId: this.#sessionId };
  }

  #status: ShadowModeStatus = ShadowModeStatus.IDLE;
  #sessionId?: string;
}
