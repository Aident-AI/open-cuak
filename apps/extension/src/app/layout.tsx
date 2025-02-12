import cx from 'classnames';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ExecutionEnvironment } from '~shared/env/ExecutionEnvironment';
import { ALogger } from '~shared/logging/ALogger';
import '~src/app/globals.css';

import type { Metadata } from 'next';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aident Companion Extension Page',
  description: 'Aident Companion, enable your ChatGPT to search and browse the web in your Chrome.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ALogger.genInit(undefined, ExecutionEnvironment.EXTENSION); // TODO: set the extension session id for realtime channel

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Permissions-Policy" content="clipboard-write=(self)" />
      </head>
      <body className={cx(sans.className, 'overflow-hidden')}>{children}</body>
    </html>
  );
}
