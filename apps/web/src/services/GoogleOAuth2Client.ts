import { type OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export const getGoogleOAuth2Client = (callback?: string): OAuth2Client =>
  new google.auth.OAuth2({
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
    redirectUri: callback ?? `${process.env.NEXT_PUBLIC_ORIGIN}/plugin/oauth/callback`,
  });
