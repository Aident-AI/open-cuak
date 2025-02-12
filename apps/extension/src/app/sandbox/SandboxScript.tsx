'use client';

import Script from 'next/script';

export default function SandboxScript() {
  const scriptSrc = '../../scripts/sandbox/index.js'; // TODO: try to make this loaded from server

  return <Script src={scriptSrc} />;
}
