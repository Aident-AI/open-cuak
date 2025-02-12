import ApiPageContent from '~src/app/api/ApiPageContent';

import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: '[AidentAI] Extension API Page',
  description: 'AidentAI Extension API Page',
};

export default function ExtensionApiPage() {
  return <ApiPageContent />;
}
