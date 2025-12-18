
import React, { useMemo } from 'react';
import { JarvisStatus, HardwareStatus, VoicePersona } from '../types';

interface Props {
  status: JarvisStatus;
  isCameraOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  hardware: HardwareStatus;
  persona: VoicePersona;
  audioLevel?: number;
  frequencyData?: Uint8Array;
}

const PERSONA_COLORS: Record<VoicePersona, { primary: string, secondary: string, glow: string }> = {
  JARVIS: { primary: 'text-cyan-400', secondary: 'bg-cyan-400', glow: 'rgba(34,211,238,0.7)' },
  FRIDAY: { primary: 'text-fuchsia-400', secondary: 'bg-fuchsia-400', glow: 'rgba(232,121,249,0.7)' },
  JOCASTA: { primary: 'text-amber-400', secondary: 'bg-amber-400', glow: 'rgba(251,191,36,0.7)' },
  ANNIE: { primary: 'text-emerald-400', secondary: 'bg-emerald-400', glow: 'rgba(52,211,153,0.7)' },
  FENRIR: { primary: 'text-rose-500', secondary: 'bg-rose-500', glow: 'rgba(244,63,94,0.7)' },
  PETER: { primary: 'text-blue-400', secondary: 'bg-blue-400', glow: 'rgba(96,165,250,0.7)' },
  EDITH: { primary: 'text-slate-300', secondary: 'bg-slate-300', glow: 'rgba(203,213,225,0.7)' },
  VISION: { primary: 'text-red-600', secondary: 'bg-red-600', glow: 'rgba(220,38,38,0.7)' },
  MORGAN: { primary: 'text-pink-300', secondary: 'bg-pink-300', glow: 'rgba(249,168,212,0.7)' },
  GIDEON: { primary: 'text-purple-400', secondary: 'bg-purple-400', glow: 'rgba(192,132,252,0.7)' },
  COLSON: { primary: 'text-sky-500', secondary: 'bg-sky-500', glow: 'rgba(14,165,233,0.7)' },
  HELEN: { primary: 'text-teal-300', secondary: 'bg-teal-300', glow: 'rgba(94,234,212,0.7)' },
  ULTRON: { primary: 'text-red-800', secondary: 'bg-red-800', glow: 'rgba(153,27,27,0.7)' },
};

const HolographicHud: React.FC<Props> = ({ status, isCameraOn, videoRef, hardware, persona, audioLevel = 0, frequencyData }) => {
  const isInteracting = status !== JarvisStatus.IDLE && status !== JarvisStatus.ERROR && status !== JarvisStatus.INITIALIZING;
  const colors = hardware.roastMode ? { primary: 'text-red-500', secondary: 'bg-red-500', glow: 'rgba(239, 68, 68, 0.7)' } : (PERSONA_COLORS[persona] || PERSONA_COLORS.JARVIS);
  const dynamicScale = isInteracting ? 1 + (audioLevel * 0.35) : 1;

  const spectrumBars = useMemo(() => {
    if (!frequencyData) return null;
    const bars = [];
    const step = Math.floor(frequencyData.length / 64);
    for (let i = 0; i < 64; i++) {
      const val = frequencyData[i * step] / 255;
      bars.push(
        <div 
          key={i} 
          className={`w-1 rounded-full transition-all duration-75 ${colors.secondary}`}
          style={{ 
            height: `${Math.max(4, val * 180)}px`, 
            opacity: 0.15 + (val * 0.85),
            boxShadow: `0 0 12px ${colors.glow}`
          }}
        />
      );
    }
    return bars;
  }, [frequencyData, colors]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center pointer-events-none overflow-hidden transition-colors duration-1000 ${hardware.roastMode ? 'bg-red-950/10' : ''}`}>
      {/* Glitch Overlay for Roast Mode */}
      {hardware.roastMode && (
        <div className="absolute inset-0 z-50 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] mix-blend-overlay animate-pulse"></div>
      )}

      {/* Sensor Stream Viewport */}
      <div className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${isCameraOn ? 'opacity-40 grayscale-[0.2] scale-100 brightness-110' : 'opacity-0 scale-110 blur-3xl'}`}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#010409] via-transparent to-[#010409]"></div>
        <div className={`absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]`}></div>
      </div>

      <div className="relative flex items-center justify-center transition-all duration-[1000ms] ease-out" style={{ transform: `scale(${dynamicScale})` }}>
        
        {/* Orbital Systems */}
        <div className={`absolute w-[1200px] h-[1200px] border rounded-full animate-rotate-slow opacity-5 border-white`}></div>
        <div className={`absolute w-[1000px] h-[1000px] border-[2px] rounded-full animate-rotate-reverse opacity-10 border-dashed border-white`}></div>
        
        {/* Corner Brackets */}
        <div className={`absolute -top-[450px] -left-[550px] w-64 h-32 border-l-4 border-t-4 p-4 opacity-50 transition-colors duration-1000 ${colors.primary.replace('text-', 'border-')}`}>
           <div className={`orbitron text-[9px] tracking-[4px] font-bold mb-2 ${colors.primary}`}>COORD_SYS_v4.2</div>
           <div className="mono text-[10px] text-white/80">LAT: {hardware.lat?.toFixed(6) || '---'}</div>
           <div className="mono text-[10px] text-white/80">LNG: {hardware.lng?.toFixed(6) || '---'}</div>
           {hardware.roastMode && <div className="orbitron text-[8px] text-red-500 mt-2 animate-pulse font-bold">TARGETING_ACTIVE</div>}
        </div>

        <div className={`absolute -top-[450px] -right-[550px] w-64 h-32 border-r-4 border-t-4 p-4 text-right opacity-50 transition-colors duration-1000 ${colors.primary.replace('text-', 'border-')}`}>
           <div className={`orbitron text-[9px] tracking-[4px] font-bold mb-2 ${colors.primary}`}>AGGRESSION_LIMITER</div>
           <div className="mono text-[10px] text-white/80 uppercase">STATUS: {hardware.roastMode ? 'BYPASSED' : 'STABLE'}</div>
           <div className="mono text-[10px] text-white/80 uppercase">PROTOCOL: {hardware.roastMode ? 'PWNIN_PUBG' : hardware.language}</div>
        </div>

        {/* Reactive Frequency Floor */}
        <div className={`absolute bottom-[-240px] flex items-end gap-1.5 transition-all duration-[1200ms] ${isInteracting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-40'}`}>
          {spectrumBars}
        </div>

        {/* Central Neural Interface */}
        <div className={`relative w-[400px] h-[400px] flex items-center justify-center transition-all duration-[1500ms] ${isInteracting ? 'scale-110' : 'scale-100'}`}>
          <div className={`absolute inset-0 blur-[150px] rounded-full transition-all duration-[2000ms] ${colors.secondary} ${isInteracting ? 'opacity-20' : 'opacity-0'}`}></div>
          
          <div className={`absolute inset-0 border-[10px] rounded-full border-dotted animate-rotate-reverse opacity-20 transition-colors duration-1000 ${colors.primary.replace('text-', 'border-')}`}></div>
          <div className={`absolute inset-12 border rounded-full animate-rotate opacity-40 transition-colors duration-1000 ${colors.primary.replace('text-', 'border-')}`}></div>
          
          <div 
            className={`absolute inset-16 animate-fluid mix-blend-screen transition-all duration-[800ms] ${isInteracting ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`} 
            style={{ 
              background: `radial-gradient(circle, ${colors.glow.replace('0.7', '0.4')} 0%, transparent 70%)`,
              transform: `scale(${1 + audioLevel * 3}) rotate(${audioLevel * 1440}deg)`,
              filter: `blur(${audioLevel * 15}px)` 
            }}
          ></div>
          
          <div className="relative z-20 flex flex-col items-center">
            <svg viewBox="0 0 100 100" className={`w-56 h-56 transition-all duration-[600ms] ${status === JarvisStatus.SPEAKING ? 'scale-110' : 'scale-100'}`} style={{ filter: `drop-shadow(0 0 60px ${colors.glow})` }}>
              <path d="M50 2 L98 25 L98 75 L50 98 L2 75 L2 25 Z" fill="none" stroke="currentColor" strokeWidth="0.8" className={`${colors.primary} opacity-60`} />
              <path d="M50 18 L82 36 L82 64 L50 82 L18 64 L18 36 Z" fill="currentColor" className={`${colors.primary} transition-opacity duration-[1000ms] ${isInteracting ? 'opacity-40' : 'opacity-10'}`} />
              <circle cx="50" cy="50" r="16" fill="currentColor" className={`text-white transition-all duration-500 ${isInteracting ? 'opacity-100 scale-125 shadow-[0_0_40px_white]' : 'opacity-20 scale-100'}`} />
            </svg>
          </div>
        </div>

        {/* Side Panels */}
        <div className={`absolute -right-[520px] flex flex-col gap-16 transition-all duration-[1200ms] ${isInteracting ? 'translate-x-0 opacity-100' : 'translate-x-80 opacity-0'}`}>
             <div className={`text-right border-r-8 pr-12 py-4 bg-white/5 rounded-l-2xl shadow-glow transition-colors duration-1000 ${colors.primary.replace('text-', 'border-')}`} style={{ '--tw-shadow-color': colors.glow.replace('0.7', '0.1') } as any}>
               <span className={`orbitron text-[12px] tracking-[10px] block mb-5 font-bold uppercase ${colors.primary}`}>KILL_LOG</span>
               <div className="flex flex-col gap-4 text-[13px] mono">
                 <div className="flex justify-end gap-6 items-center">
                   <span className="opacity-40 text-[10px]">WINS:</span>
                   <span className="text-white/80 font-bold">999+</span>
                 </div>
                 <div className="flex justify-end gap-6 items-center">
                   <span className="opacity-40 text-[10px]">ELO:</span>
                   <span className="text-green-400">CONQUEROR</span>
                 </div>
               </div>
             </div>
        </div>

        <div className={`absolute -left-[520px] flex flex-col gap-16 transition-all duration-[1200ms] ${isInteracting ? 'translate-x-0 opacity-100' : 'translate-x-80 opacity-0'}`}>
             <div className={`text-left border-l-8 pl-12 py-4 bg-white/5 rounded-r-2xl shadow-glow transition-colors duration-1000 ${colors.primary.replace('text-', 'border-')}`} style={{ '--tw-shadow-color': colors.glow.replace('0.7', '0.1') } as any}>
               <span className={`orbitron text-[12px] tracking-[10px] block mb-5 font-bold uppercase ${colors.primary}`}>PWN_ENGINE_v1</span>
               <div className="flex flex-col gap-2 text-[13px] mono w-80">
                 <div className="text-white/90 truncate font-bold tracking-widest">{hardware.roastMode ? 'AGGRESSION: MAX' : hardware.platform}</div>
                 <div className="text-[10px] opacity-30 leading-relaxed mt-4 truncate font-mono uppercase">{hardware.roastMode ? 'ROAST_PROTOCOL_V6.9_STABLE' : hardware.userAgent}</div>
               </div>
             </div>
        </div>
      </div>

      <div className="absolute bottom-64 w-full text-center flex flex-col items-center">
        <div className={`px-28 py-8 border-y-2 transition-all duration-[1000ms] bg-black/40 backdrop-blur-3xl ${colors.primary.replace('text-', 'border-')} ${isInteracting ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-90'}`}>
          <h2 className={`orbitron text-5xl tracking-[1.8em] font-bold uppercase transition-colors duration-1000 ${colors.primary}`} style={{ textShadow: `0 0 30px ${colors.glow}` }}>
            {hardware.roastMode ? 'PWNIN_SIR' : status}
          </h2>
          <div className="h-[4px] w-full overflow-hidden bg-white/5 mt-8 rounded-full">
            <div className={`h-full transition-all duration-[1500ms] ease-in-out ${colors.secondary}`} style={{ width: isInteracting ? '100%' : '0%', boxShadow: `0 0 30px ${colors.glow}` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolographicHud;
