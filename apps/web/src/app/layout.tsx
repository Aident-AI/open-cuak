import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';
import { CookiesProvider } from 'next-client-cookies/server';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { X_REQUEST_ID_HEADER } from '~shared/http/headers';
import { ALogger } from '~shared/logging/ALogger';
import '~src/app/globals.css';
import { AnalyticsComponent } from '~src/components/AnalyticsComponent';
import { UserSessionContextProvider } from '~src/contexts/UserSessionContext';

import type { Metadata } from 'next';
const sans = Plus_Jakarta_Sans({ subsets: ['latin'] });

// TODO: refine the message
export const metadata: Metadata = {
  title: 'Open-CUAK by Aident AI',
  description: 'Reliable Automation Agents at Scale. Open-CUAK by Aident AI.',
  icons: { icon: '/favicon.svg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const requestId = headersList.get(X_REQUEST_ID_HEADER);
  if (!requestId) throw new Error('Request ID is not set in headers.');
  await ALogger.genInit(requestId, ExecutionEnvironment.WEB_CLIENT);

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Permissions-Policy" content="clipboard-write=(self)" />
      </head>
      <body className={sans.className}>
        <CookiesProvider>
          <UserSessionContextProvider requestId={requestId}>{children}</UserSessionContextProvider>
        </CookiesProvider>

        <>
          <AnalyticsComponent />
          <VercelAnalytics />
          <VercelSpeedInsights />
        </>
      </body>
    </html>
  );
}
