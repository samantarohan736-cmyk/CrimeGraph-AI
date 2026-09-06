import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export default function Toast({ type, message, onClose }) {
  if (!message) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 border-[3px] border-black shadow-[6px_6px_0_0_#000] font-mono font-black animate-in slide-in-from-bottom-5 ${
      type === 'success' ? 'bg-brutal-lime text-black' : 'bg-brutal-pink text-black'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
      <span className="text-xs uppercase">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-black hover:text-white transition-colors">
          &times;
        </button>
      )}
    </div>
  );
}
