import React from 'react';

export default function DisclaimerBanner() {
  return (
    <div className="bg-brutal-yellow border-b-[3px] border-black text-black px-4 py-1.5 text-xs font-black font-mono flex items-center justify-between z-30 shadow-[0_3px_0_0_#000000]">
      <div className="flex items-center gap-2">
        <span className="neo-badge bg-black text-[10px]" style={{ color: '#FFE600' }}>
          RESPONSIBLE AI
        </span>
        <span className="text-[11px] font-mono font-bold tracking-tight">
          CrimeGraph AI provides analytical prioritization leads and does not determine guilt, criminality, or intent.
        </span>
      </div>
      <div className="hidden lg:flex items-center gap-2 text-black text-[11px] font-mono font-black">
        <span className="w-2.5 h-2.5 rounded-full bg-black"></span>
        <span>AUDITED EVIDENCE GROUNDED</span>
      </div>
    </div>
  );
}
