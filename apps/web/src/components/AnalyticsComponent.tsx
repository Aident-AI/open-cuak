'use client';

import { useGoogleAnalytics } from '~src/hooks/useGoogleAnalytics';
import { useHeapAnalytics } from '~src/hooks/useHeapAnalytics';

export const AnalyticsComponent = () => {
  useGoogleAnalytics(process.env.NEXT_PUBLIC_GA_TRACKING_ID ?? '');
  useHeapAnalytics(process.env.NEXT_PUBLIC_HEAP_PROJECT_ID ?? '');

  return null;
};
