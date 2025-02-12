import { z } from 'zod';

export const OPENAI_OAUTH_COOKIE = 'openai-oauth';
export const OpenaiOAuthCookieSchema = z.object({
  state: z.string(),
  redirect_uri: z.string(),
});
export type OpenaiOAuthCookie = z.infer<typeof OpenaiOAuthCookieSchema>;
