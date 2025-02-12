import type { Metadata } from 'next';
import SandboxScript from '~src/app/sandbox/SandboxScript';

export const metadata: Metadata = {
  title: '[AidentAI] Sandbox iFrame',
  description: 'AidentAI Sandbox iFrame',
};

export default function SandboxPage() {
  return (
    <main>
      <SandboxScript />
    </main>
  );
}
