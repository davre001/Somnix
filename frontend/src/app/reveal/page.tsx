'use client';

import React from 'react';
import { TopBar } from '@/components/TopBar';
import { RevealPanel } from '@/components/RevealPanel';

export default function RevealPage() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-transparent">
      <TopBar />
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex-1 flex flex-col items-center justify-center">
        <RevealPanel />
      </main>
    </div>
  );
}
