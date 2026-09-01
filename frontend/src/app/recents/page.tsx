'use client';

import React from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { RecentsList } from '@/components/RecentsList';
import { ArrowLeft } from 'lucide-react';

export default function RecentsPage() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-transparent">
      <TopBar />
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex-1 flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live Window</span>
          </Link>
        </div>

        <RecentsList />
      </main>
    </div>
  );
}
