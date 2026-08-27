import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = "Loading intelligence records..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
      <p className="text-sm font-mono text-slate-700 tracking-wide font-bold">{message}</p>
    </div>
  );
}
