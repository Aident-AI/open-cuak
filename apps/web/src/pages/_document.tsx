import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta httpEquiv="Permissions-Policy" content="clipboard-write=(self)" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
