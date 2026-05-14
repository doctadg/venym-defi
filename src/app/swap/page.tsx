'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SettingProvider } from '@/contexts/SettingProvider';

const SwapPanel = dynamic(
  () => import('@/components/swap/SwapPanel'),
  { ssr: false }
);

export default function SwapPage() {
  return (
    <SettingProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
        </div>
      }>
        <SwapPanel />
      </Suspense>
    </SettingProvider>
  );
}
