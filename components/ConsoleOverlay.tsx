
import React, { useEffect, useRef } from 'react';
import { JarvisLog } from '../types';

interface Props {
  logs: JarvisLog[];
}

const ConsoleOverlay: React.FC<Props> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  return (
    <div className="fixed bottom-12 left-12 w-96 h-56 glass rounded-[2rem] overflow-hidden flex flex-col pointer-events-none md:pointer-events-auto transition-all duration-700 hover:scale-[1.03] hover:border-cyan-400/50 group shadow-2xl">
      <div className="px-6 py-4 flex items-center justify-between border-b border-cyan-500/20 bg-cyan-950/20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]"></div>
          <span className="orbitron text-[10px] font-bold text-cyan-400 tracking-[4px] uppercase">Data_Stream</span>
        </div>
        <div className="text-[9px] font-mono text-cyan-500/40 tracking-[2px]">SECURE_FEED: 0x8A92</div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 scrollbar-hide text-[11px] font-mono p-6 pr-4 bg-black/20"
      >
        {logs.map((log) => (
          <div key={log.id} className="leading-relaxed animate-fadeIn flex gap-3 group/log">
            <span className="opacity-20 tabular-nums shrink-0 font-bold">[{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <div className="flex flex-col">
              <span className={`font-bold tracking-widest text-[9px] uppercase mb-0.5 ${
                log.source === 'JARVIS' ? 'text-cyan-400' : 
                log.source === 'USER' ? 'text-blue-500' : 'text-slate-500'
              }`}>
                {log.source}>
              </span>
              <span className="text-slate-300 break-words opacity-80 group-hover/log:opacity-100 transition-opacity">{log.message}</span>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic opacity-20 space-y-4">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
            <span className="orbitron text-[8px] tracking-[6px] uppercase">System_Idle_Mode</span>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
          </div>
        )}
      </div>

      <div className="h-1.5 w-full bg-cyan-950/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full bg-cyan-500/40 w-1/4 animate-[wave-flow_2s_linear_infinite] shadow-[0_0_10px_cyan]"></div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wave-flow { from { left: -100%; } to { left: 100%; } }
      `}</style>
    </div>
  );
};

export default ConsoleOverlay;
