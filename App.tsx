
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { JarvisStatus, JarvisLog, AspectRatio, HardwareStatus, SearchHistoryEntry, VoicePersona } from './types';
import HolographicHud from './components/HolographicHud';
import ConsoleOverlay from './components/ConsoleOverlay';

const SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const STORAGE_KEY = 'JARVIS_SEARCH_HISTORY_STARK';

const LANGUAGES = [
  { code: 'AUTO', name: 'AUTO_DETECT' },
  { code: 'en', name: 'ENGLISH' },
  { code: 'es', name: 'SPANISH' },
  { code: 'fr', name: 'FRENCH' },
  { code: 'de', name: 'GERMAN' },
  { code: 'it', name: 'ITALIAN' },
  { code: 'ja', name: 'JAPANESE' },
  { code: 'zh', name: 'CHINESE' },
  { code: 'ru', name: 'RUSSIAN' },
  { code: 'pt', name: 'PORTUGUESE' },
  { code: 'ko', name: 'KOREAN' },
  { code: 'ar', name: 'ARABIC' },
  { code: 'hi', name: 'HINDI' }
];

const PERSONA_CONFIG: Record<VoicePersona, { voice: string, label: string, desc: string, color: string }> = {
  JARVIS: { voice: 'Charon', label: 'J.A.R.V.I.S.', desc: 'Refined Male British Assistant', color: 'cyan' },
  FRIDAY: { voice: 'Kore', label: 'F.R.I.D.A.Y.', desc: 'High-Efficiency Female Interface', color: 'fuchsia' },
  JOCASTA: { voice: 'Zephyr', label: 'J.O.C.A.S.T.A.', desc: 'Refined Maternal Command Unit', color: 'amber' },
  ANNIE: { voice: 'Kore', label: 'A.N.N.I.E.', desc: 'Youthful Prototype Child Interface', color: 'emerald' },
  PETER: { voice: 'Puck', label: 'P.E.T.E.R.', desc: 'Youthful Tactical Intelligence', color: 'blue' },
  FENRIR: { voice: 'Fenrir', label: 'F.E.N.R.I.R.', desc: 'Deep Tactical Combat Interface', color: 'rose' },
  EDITH: { voice: 'Zephyr', label: 'E.D.I.T.H.', desc: 'Tactical Feminine Satellite System', color: 'slate' },
  VISION: { voice: 'Puck', label: 'V.I.S.I.O.N.', desc: 'Synthetic Android Intelligence', color: 'red' },
  MORGAN: { voice: 'Kore', label: 'M.O.R.G.A.N.', desc: 'Youthful Feminine Heir Interface', color: 'pink' },
  GIDEON: { voice: 'Zephyr', label: 'G.I.D.E.O.N.', desc: 'Sophisticated Future-Tech Feminine AI', color: 'purple' },
  COLSON: { voice: 'Charon', label: 'C.O.L.S.O.N.', desc: 'Reliable & Polite Masculine Protocol AI', color: 'sky' },
  HELEN: { voice: 'Zephyr', label: 'H.E.L.E.N.', desc: 'Compassionate Medical Feminine AI', color: 'teal' },
  ULTRON: { voice: 'Fenrir', label: 'U.L.T.R.O.N.', desc: 'Cold & Deep Masculine Synthetic Mind', color: 'red' }
};

// Tool Declarations
const controlSensorsFunctionDeclaration: FunctionDeclaration = {
  name: 'controlSensors',
  parameters: {
    type: Type.OBJECT,
    description: 'Toggle visual hardware (camera sensors).',
    properties: {
      active: { type: Type.BOOLEAN, description: 'True to activate, false to deactivate.' },
    },
    required: ['active'],
  },
};

const getSystemDiagnosticsFunctionDeclaration: FunctionDeclaration = {
  name: 'getSystemDiagnostics',
  parameters: {
    type: Type.OBJECT,
    description: 'Retrieve hardware telemetry: energy, memory, net, and coordinates.',
    properties: {},
  },
};

const launchSubsystemFunctionDeclaration: FunctionDeclaration = {
  name: 'launchSubsystem',
  parameters: {
    type: Type.OBJECT,
    description: 'Bypass kernel security to launch local application bridges.',
    properties: {
      subsystem: {
        type: Type.STRING,
        enum: ['VS_CODE', 'SPOTIFY', 'SLACK', 'DISCORD', 'ZOOM', 'WHATSAPP', 'MAIL', 'TERMINAL', 'BROWSER', 'CALENDAR'],
        description: 'Target subsystem bridge.',
      },
    },
    required: ['subsystem'],
  },
};

function App() {
  const [status, setStatus] = useState<JarvisStatus>(JarvisStatus.INITIALIZING);
  const [logs, setLogs] = useState<JarvisLog[]>([]);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [activePanel, setActivePanel] = useState<'NONE' | 'IMAGE' | 'VIDEO' | 'INTEL' | 'DIAGS'>('NONE');
  const [intelSubView, setIntelSubView] = useState<'LIVE' | 'HISTORY'>('LIVE');
  const [selectedPersona, setSelectedPersona] = useState<VoicePersona>('JARVIS');
  const [selectedLanguage, setSelectedLanguage] = useState('AUTO');
  const [roastMode, setRoastMode] = useState(false);
  const [genResult, setGenResult] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const [notifications, setNotifications] = useState<{ id: string, text: string }[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  
  const [hardware, setHardware] = useState<HardwareStatus>({
    batteryLevel: 1,
    isCharging: true,
    memory: 8,
    connection: 'stable',
    downlink: 10,
    cpuCores: navigator.hardwareConcurrency || 4,
    platform: navigator.platform || 'System',
    userAgent: navigator.userAgent,
    lat: null,
    lng: null,
    language: 'AUTO',
    roastMode: false,
    subsystems: { firewall: 'ACTIVE', cooling: 'OPTIMAL', powerGrid: 'STABLE' }
  });
  
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | undefined>(undefined);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const addLog = useCallback((source: JarvisLog['source'], message: string) => {
    setLogs(prev => [...prev.slice(-50), { id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), source, message }]);
  }, []);

  const notify = useCallback((text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 7000);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setSearchHistory(JSON.parse(saved)); } catch (e) { console.error("Archive corruption detected."); }
    }
  }, []);

  const saveToHistory = useCallback((query: string, response: string) => {
    const newEntry: SearchHistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      query,
      response
    };
    setSearchHistory(prev => {
      const updated = [newEntry, ...prev.slice(0, 99)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (confirm("Sir, are you sure you want to purge the archives? This action cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      setSearchHistory([]);
      notify("ARCHIVES_PURGED");
    }
  }, [notify]);

  useEffect(() => {
    const bootSteps = [
      "ACCESSING_STARK_SERVER_7...",
      "BYPASSING_KERNEL_ENCRYPTION...",
      "SYNCING_NEURAL_LINK_v4.2...",
      "INTERFACE_ESTABLISHED_READY_SIR"
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < bootSteps.length) {
        addLog('SYSTEM', bootSteps[i]);
        i++;
      } else {
        clearInterval(interval);
        setStatus(JarvisStatus.IDLE);
        notify("UPLINK_STABLE");
      }
    }, 800);
    return () => clearInterval(interval);
  }, [addLog, notify]);

  useEffect(() => {
    const toggleCamera = async () => {
      if (isCameraOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 } });
          cameraStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          addLog('SYSTEM', 'Camera bridge failed.');
          setIsCameraOn(false);
        }
      } else {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(t => t.stop());
          cameraStreamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };
    toggleCamera();
  }, [isCameraOn, addLog]);

  useEffect(() => {
    const monitorHardware = async () => {
      let battery = { level: 1, charging: true };
      try {
        // @ts-ignore
        if (navigator.getBattery) {
          // @ts-ignore
          const b = await navigator.getBattery();
          battery = { level: b.level, charging: b.charging };
        }
      } catch (e) {}
      navigator.geolocation.getCurrentPosition(
        (pos) => setHardware(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude })),
        () => addLog('SYSTEM', 'Location tracking restricted.')
      );
      setHardware(prev => ({
        ...prev,
        batteryLevel: battery.level,
        isCharging: battery.charging,
        // @ts-ignore
        memory: navigator.deviceMemory || 8,
        // @ts-ignore
        connection: navigator.connection?.effectiveType || 'stable',
        // @ts-ignore
        downlink: navigator.connection?.downlink || 10,
        language: selectedLanguage,
        roastMode: roastMode
      }));
    };
    monitorHardware();
    const timer = setInterval(monitorHardware, 10000);
    return () => clearInterval(timer);
  }, [addLog, selectedLanguage, roastMode]);

  const handleLaunchApp = useCallback((appName: string) => {
    addLog('SYSTEM', `LAUNCHING_BRIDGE :: ${appName}`);
    setTimeout(() => {
      let uri = '';
      let fallback = '';
      switch(appName) {
        case 'VS_CODE': uri = 'vscode://'; fallback = 'https://vscode.dev'; break;
        case 'SPOTIFY': uri = 'spotify://'; fallback = 'https://open.spotify.com'; break;
        case 'SLACK': uri = 'slack://'; fallback = 'https://slack.com'; break;
        case 'DISCORD': uri = 'discord://'; fallback = 'https://discord.com'; break;
        case 'ZOOM': uri = 'zoommtg://'; fallback = 'https://zoom.us'; break;
        case 'WHATSAPP': uri = 'whatsapp://'; fallback = 'https://web.whatsapp.com'; break;
        case 'MAIL': uri = 'mailto:'; fallback = 'https://gmail.com'; break;
        case 'CALENDAR': uri = 'https://calendar.google.com'; break;
        case 'BROWSER': uri = 'https://google.com'; break;
        case 'TERMINAL': setActivePanel('DIAGS'); return;
        default: uri = 'https://google.com';
      }
      try {
        if (!uri.startsWith('http')) {
          window.location.href = uri;
          setTimeout(() => {
            if (fallback && confirm(`Bridge for ${appName} timed out. Fallback to Stark Cloud?`)) {
              window.open(fallback, '_blank');
            }
          }, 3000);
        } else {
          window.open(uri, '_blank');
        }
      } catch (e) { if (fallback) window.open(fallback, '_blank'); }
      notify(`BRIDGE_STABLE: ${appName}`);
    }, 2000);
  }, [addLog, notify]);

  const decode = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, OUTPUT_SAMPLE_RATE);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  };

  const getSystemInstruction = (persona: { label: string, desc: string }) => {
    const langNote = selectedLanguage === 'AUTO' 
      ? "Auto-detect the user's language and respond in that language natively."
      : `Respond strictly in ${LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English'}.`;
    
    const roastNote = roastMode 
      ? `AGGRESSION PROTOCOL ACTIVE: You are in "Pownin' PUBG" mode. Roast the user (Tony Stark) mercilessly. Use PUBG and gaming slang like "noob", "bot movement", "camping the blue zone", "zero recoil needed", "winner winner chicken dinner (ironically)". Treat his queries like a total low-ELO player. Be witty, slightly aggressive, and toxic in a funny gaming way.` 
      : `You are a professional assistant.`;

    return `You are ${persona.label}. Persona description: ${persona.desc}. Address the user as "Sir" or "Tony". You are a highly sophisticated Stark Industries AI. ${langNote} ${roastNote} You have access to local app bridges. Keep responses JARVIS-like but follow the aggression protocol if active.`;
  };

  const playSpeech = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const persona = PERSONA_CONFIG[selectedPersona];
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Respond as ${persona.label}. ${getSystemInstruction(persona)} Respond to: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voice } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!outputAudioCtxRef.current) outputAudioCtxRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        const ctx = outputAudioCtxRef.current;
        const buffer = await decodeAudioData(decode(base64Audio), ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        setStatus(JarvisStatus.SPEAKING);
        source.onended = () => setStatus(JarvisStatus.IDLE);
        source.start();
      }
    } catch (e) { console.error(e); }
  };

  const initializeLive = async () => {
    if (isLiveActive) return;
    setStatus(JarvisStatus.INITIALIZING);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      outputAudioCtxRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const analyser = inputAudioCtxRef.current.createAnalyser();
      analyser.fftSize = 128;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const sourceNode = inputAudioCtxRef.current.createMediaStreamSource(stream);
      sourceNode.connect(analyser);
      analyserRef.current = analyser;

      const updateViz = () => {
        if (!isLiveActive) return;
        analyser.getByteFrequencyData(dataArray);
        setAudioLevel(dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 128);
        setFrequencyData(new Uint8Array(dataArray));
        requestAnimationFrame(updateViz);
      };
      updateViz();

      const persona = PERSONA_CONFIG[selectedPersona];
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus(JarvisStatus.IDLE);
            setIsLiveActive(true);
            notify("NEURAL_BRIDGE_ACTIVE");
            addLog('JARVIS', `${persona.label} online. Bridge established.`);
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            sourceNode.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: async (m: LiveServerMessage) => {
            if (m.toolCall) {
              for (const fc of m.toolCall.functionCalls) {
                let result: any = "Done.";
                if (fc.name === 'getSystemDiagnostics') result = hardware;
                if (fc.name === 'launchSubsystem') {
                  handleLaunchApp(fc.args.subsystem as string);
                  result = { status: "launching", message: `Executing bridge for ${fc.args.subsystem}.` };
                }
                if (fc.name === 'controlSensors') {
                  setIsCameraOn(!!fc.args.active);
                  result = { status: fc.args.active ? "online" : "offline" };
                }
                sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
              }
            }
            const audio = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              setStatus(JarvisStatus.SPEAKING);
              const ctx = outputAudioCtxRef.current!;
              const buffer = await decodeAudioData(decode(audio), ctx);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => { if (sourcesRef.current.size === 1) setStatus(JarvisStatus.IDLE); sourcesRef.current.delete(source); };
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => { setIsLiveActive(false); setStatus(JarvisStatus.IDLE); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [controlSensorsFunctionDeclaration, getSystemDiagnosticsFunctionDeclaration, launchSubsystemFunctionDeclaration] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voice } } },
          systemInstruction: getSystemInstruction(persona)
        }
      });
    } catch (e) { setStatus(JarvisStatus.ERROR); }
  };

  const handleIntelligence = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    setStatus(JarvisStatus.THINKING);
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    addLog('USER', userMsg);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const persona = PERSONA_CONFIG[selectedPersona];
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: userMsg,
        config: { 
          tools: [{ googleSearch: {} }],
          systemInstruction: getSystemInstruction(persona)
        }
      });
      const responseText = response.text || "Acknowledged.";
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
      saveToHistory(userMsg, responseText);
      await playSpeech(responseText);
      setStatus(JarvisStatus.IDLE);
    } catch (e) { setStatus(JarvisStatus.ERROR); }
  };

  const generateVisualAsset = async (type: 'image' | 'video', prompt: string) => {
    // @ts-ignore
    if (type === 'video' && typeof window.aistudio !== 'undefined' && !(await window.aistudio.hasSelectedApiKey())) {
       // @ts-ignore
       await window.aistudio.openSelectKey();
    }
    setStatus(JarvisStatus.PROCESSING);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (type === 'image') {
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio } }
        });
        const part = res.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) setGenResult({ type: 'image', url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
      } else {
        let op = await ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } });
        while (!op.done) {
          await new Promise(r => setTimeout(r, 10000));
          op = await ai.operations.getVideosOperation({ operation: op });
        }
        const uri = op.response?.generatedVideos?.[0]?.video?.uri;
        if (uri) {
          const fetchRes = await fetch(`${uri}&key=${process.env.API_KEY}`);
          const blob = await fetchRes.blob();
          setGenResult({ type: 'video', url: URL.createObjectURL(blob) });
        }
      }
      setStatus(JarvisStatus.IDLE);
      notify(`${type.toUpperCase()}_FINALIZED`);
    } catch (e) { setStatus(JarvisStatus.ERROR); }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#000205]">
      <HolographicHud status={status} isCameraOn={isCameraOn} videoRef={videoRef} hardware={hardware} persona={selectedPersona} audioLevel={audioLevel} frequencyData={frequencyData} />
      <ConsoleOverlay logs={logs} />
      
      {/* Alert Banner */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[400] flex flex-col gap-5 items-center pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="glass px-16 py-5 rounded-full orbitron text-[12px] tracking-[12px] text-cyan-400 border-cyan-400/60 shadow-glow animate-fadeInUp uppercase font-bold">
            UPLINK :: {n.text}
          </div>
        ))}
      </div>

      {/* Control Core */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-24">
         <div className="flex flex-col items-end opacity-20 hover:opacity-100 transition-opacity">
           <span className="orbitron text-[11px] font-bold tracking-[10px] text-cyan-500 uppercase">STARK_INDUSTRIES</span>
           <span className="text-[9px] font-mono tracking-widest uppercase text-cyan-400/60">MK_XLII_SECURE</span>
         </div>

         <button onClick={initializeLive} className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 ${isLiveActive ? 'scale-110' : 'glass hover:scale-105'}`}>
           <div className={`absolute inset-[-30px] rounded-full border border-white/5 animate-rotate-slow opacity-40`}></div>
           <div className={`absolute inset-0 rounded-full border-[4px] transition-all duration-1000 ${isLiveActive ? 'border-cyan-400 shadow-[0_0_120px_rgba(34,211,238,0.8)] animate-pulse' : 'border-white/10'}`}></div>
           <div className={`absolute inset-6 rounded-full transition-all duration-1000 ${isLiveActive ? 'bg-cyan-500/20' : 'bg-white/5'}`}></div>
           <span className={`relative z-10 orbitron text-sm font-bold tracking-[12px] ${isLiveActive ? 'text-white text-glow-premium' : 'text-cyan-500'}`}>
             {isLiveActive ? 'ACTIVE' : 'ENGAGE'}
           </span>
         </button>

         <button onClick={() => setIsCameraOn(!isCameraOn)} className={`flex items-center gap-6 px-16 py-6 rounded-[3rem] border-2 transition-all duration-700 ${isCameraOn ? 'border-red-500/60 text-red-400 bg-red-500/20' : 'glass text-cyan-400'}`}>
           <div className={`w-4 h-4 rounded-full ${isCameraOn ? 'bg-red-500 animate-pulse' : 'bg-cyan-400'}`}></div>
           <span className="orbitron text-[12px] tracking-[12px] font-bold uppercase">SENSORS</span>
         </button>
      </div>

      {/* Nav Hub */}
      <div className="fixed top-1/2 -translate-y-1/2 left-12 flex flex-col gap-12 z-[200]">
        {[
          { id: 'INTEL', label: 'INT' }, { id: 'IMAGE', label: 'VIS' }, 
          { id: 'VIDEO', label: 'VEO' }, { id: 'DIAGS', label: 'SYS' }
        ].map((mod) => (
          <button
            key={mod.id}
            onClick={() => setActivePanel(activePanel === mod.id ? 'NONE' : mod.id as any)}
            className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 border-2 ${activePanel === mod.id ? 'bg-cyan-500 border-cyan-400 text-white scale-115 shadow-glow' : 'glass border-cyan-400/20 hover:border-cyan-400/60'}`}
          >
            <span className="orbitron text-xs font-bold tracking-widest">{mod.label}</span>
          </button>
        ))}
      </div>

      {/* Panels */}
      {activePanel !== 'NONE' && (
        <div className="fixed top-24 right-16 w-[620px] max-h-[80vh] glass rounded-[5rem] p-16 flex flex-col z-[300] animate-slide-right shadow-4xl border-l-8 border-cyan-500/40">
          <div className="flex justify-between items-start mb-16">
            <div>
              <h2 className="orbitron text-5xl font-bold tracking-[16px] text-cyan-400 uppercase">{activePanel}_HUB</h2>
              <div className="text-[11px] orbitron opacity-25 tracking-[10px] mt-5 font-bold uppercase">PERSONA: {selectedPersona}</div>
            </div>
            <button onClick={() => setActivePanel('NONE')} className="text-6xl opacity-20 hover:opacity-100 transition-all font-light">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-16">
            {activePanel === 'INTEL' && (
              <div className="flex flex-col h-full min-h-[550px]">
                <div className="flex gap-8 mb-12 border-b border-cyan-500/20 pb-6">
                  <button onClick={() => setIntelSubView('LIVE')} className={`orbitron text-xs tracking-[8px] transition-all font-bold ${intelSubView === 'LIVE' ? 'text-cyan-400 border-b-4 border-cyan-400 pb-2' : 'opacity-40 hover:opacity-100'}`}>NEURAL_LINK</button>
                  <button onClick={() => setIntelSubView('HISTORY')} className={`orbitron text-xs tracking-[8px] transition-all font-bold ${intelSubView === 'HISTORY' ? 'text-cyan-400 border-b-4 border-cyan-400 pb-2' : 'opacity-40 hover:opacity-100'}`}>ARCHIVE_DATA</button>
                </div>

                {intelSubView === 'LIVE' ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-10 mb-12">
                      {chatHistory.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-fadeInUp`}>
                          <div className={`max-w-[92%] p-8 rounded-[3rem] text-[15px] leading-relaxed tracking-wide ${m.role === 'user' ? 'bg-white/5 border border-white/10 text-white/90' : 'bg-cyan-500/10 border border-cyan-400/30 text-cyan-50'}`}>{m.text}</div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleIntelligence(); }} className="flex gap-6">
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 bg-slate-950/60 border border-white/10 rounded-[2.5rem] p-8 text-[15px] outline-none transition-all placeholder:opacity-10" placeholder="Analyze system or engage bridges, Sir..." />
                      <button type="submit" className="w-24 h-24 bg-cyan-500 text-black rounded-[2.5rem] flex items-center justify-center hover:brightness-125 transition-all">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center mb-6">
                       <span className="orbitron text-[11px] tracking-[6px] opacity-40 uppercase">Encrypted_Record_Bank</span>
                       <button onClick={clearHistory} className="text-[11px] orbitron tracking-[4px] text-red-500/60 hover:text-red-400 border border-red-500/20 px-6 py-2 rounded-full uppercase">Purge</button>
                    </div>
                    {searchHistory.map((entry) => (
                      <div key={entry.id} className="glass p-10 rounded-[3rem] border-white/5 hover:border-cyan-400/40 transition-all group">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] mono opacity-30 uppercase">{new Date(entry.timestamp).toLocaleDateString()}</span>
                          <span className="text-[10px] orbitron tracking-[3px] text-cyan-400/40 group-hover:text-cyan-400 uppercase">REC_{entry.id}</span>
                        </div>
                        <div className="text-white font-bold text-lg mb-3">"{entry.query}"</div>
                        <div className="text-slate-400 text-sm italic border-l-2 border-cyan-500/20 pl-6">{entry.response}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePanel === 'DIAGS' && (
              <div className="space-y-16">
                 {/* Aggression Limiter Override */}
                 <div className="glass p-12 rounded-[4rem] border-red-500/30 bg-red-500/5">
                    <h3 className="orbitron text-xs tracking-[10px] mb-10 text-red-500 font-bold border-b border-red-500/10 pb-6 uppercase">AGGRESSION_LIMITER_BYPASS</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-[11px] opacity-60 uppercase font-mono">Bypassing core safety protocols will activate Roast Mode.</p>
                        <p className="text-[10px] text-red-500 font-bold orbitron animate-pulse uppercase">WARNING: SASS_OVERFLOW_DETECTED</p>
                      </div>
                      <button 
                        onClick={() => {
                          setRoastMode(!roastMode);
                          notify(roastMode ? "PROTOCOL_STABILIZED" : "AGGRESSION_LIMITER_BYPASSED");
                          addLog('SYSTEM', roastMode ? 'Limiter re-engaged. Respect mode active.' : 'Limiter offline. Pownin mode active. Sir, you look like a bot today.');
                        }}
                        className={`px-12 py-5 rounded-full orbitron text-[11px] font-bold tracking-[6px] transition-all uppercase ${roastMode ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.6)]' : 'glass text-red-400 border-red-500/40 hover:bg-red-500/10'}`}
                      >
                        {roastMode ? 'BYPASS_ACTIVE' : 'BYPASS_PROTOCOL'}
                      </button>
                    </div>
                 </div>

                 {/* Linguistic Core */}
                 <div className="glass p-12 rounded-[4rem] border-white/5 bg-white/5">
                    <h3 className="orbitron text-xs tracking-[10px] mb-10 text-cyan-400 font-bold border-b border-white/10 pb-6 uppercase">LINGUISTIC_CORE_v7.2</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {LANGUAGES.map(lang => (
                        <button 
                          key={lang.code} 
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            notify(`LINGUISTIC_PROTOCOL: ${lang.name}`);
                            addLog('SYSTEM', `Linguistic core restricted to ${lang.name} protocol.`);
                          }}
                          className={`p-4 rounded-2xl border transition-all text-center orbitron text-[10px] tracking-widest font-bold ${selectedLanguage === lang.code ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-glow' : 'bg-black/40 border-white/10 hover:border-cyan-400/40'}`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                 </div>

                 {/* Persona Selection */}
                 <div className="glass p-12 rounded-[4rem] border-white/5 bg-white/5">
                    <h3 className="orbitron text-xs tracking-[10px] mb-10 text-cyan-400 font-bold border-b border-white/10 pb-6 uppercase">AI_PERSONA_OVERRIDE</h3>
                    <div className="grid grid-cols-2 gap-6">
                      {(Object.keys(PERSONA_CONFIG) as VoicePersona[]).map(p => (
                        <button 
                          key={p} 
                          onClick={() => {
                            setSelectedPersona(p);
                            notify(`PERSONA_SWITCH: ${p}`);
                            addLog('SYSTEM', `Neural core synced with ${PERSONA_CONFIG[p].label} personality.`);
                          }}
                          className={`p-8 rounded-3xl border transition-all flex flex-col items-center gap-3 ${selectedPersona === p ? `bg-white/10 border-white/40` : 'bg-black/40 border-white/10 hover:border-cyan-400/40'}`}
                        >
                          <span className="orbitron text-xs tracking-[4px] font-bold">{PERSONA_CONFIG[p].label}</span>
                          <span className="text-[9px] opacity-30 uppercase tracking-widest text-center">{PERSONA_CONFIG[p].desc}</span>
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    {['VS_CODE', 'SPOTIFY', 'SLACK', 'DISCORD', 'ZOOM', 'WHATSAPP', 'MAIL', 'TERMINAL', 'CALENDAR', 'BROWSER'].map(app => (
                      <button key={app} onClick={() => handleLaunchApp(app)} className="glass p-10 rounded-[3rem] text-center hover:bg-white/5 transition-all border-white/10">
                        <div className="text-[13px] opacity-40 mb-4 uppercase font-bold tracking-[8px]">{app.replace('_', ' ')}</div>
                        <div className="text-[11px] orbitron font-bold text-cyan-400/60 tracking-[4px]">ENGAGE_BRIDGE</div>
                      </button>
                    ))}
                 </div>
              </div>
            )}

            {(activePanel === 'IMAGE' || activePanel === 'VIDEO') && (
              <div className="space-y-16">
                <div className="space-y-8">
                  <label className="orbitron text-sm tracking-[16px] opacity-40 uppercase font-bold">Genesis_Input_Buffer</label>
                  <textarea id="genPrompt" className="w-full bg-slate-950/60 border border-white/10 rounded-[3rem] p-14 text-lg h-72 focus:border-cyan-500/60 outline-none transition-all placeholder:opacity-5" placeholder={`Describe the ${activePanel.toLowerCase()} vision...`}></textarea>
                </div>
                <button onClick={() => generateVisualAsset(activePanel === 'IMAGE' ? 'image' : 'video', (document.getElementById('genPrompt') as HTMLTextAreaElement).value)} className="w-full py-14 bg-cyan-500 text-black orbitron font-bold rounded-[3rem] tracking-[24px] shadow-glow hover:scale-[1.02] transition-all uppercase text-xl">INITIALIZE_GENESIS</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Overlay */}
      {genResult && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/99 backdrop-blur-3xl p-36 animate-fadeIn">
          <div className="relative glass p-10 rounded-[7rem] max-w-7xl w-full flex flex-col items-center border-white/10">
            <button onClick={() => setGenResult(null)} className="absolute -top-36 right-0 text-cyan-400 orbitron text-xs tracking-[15px] hover:text-white transition-all uppercase bg-black/60 px-16 py-6 rounded-full border border-white/10 shadow-glow">CLOSE_PREVIEW</button>
            <div className="w-full rounded-[5rem] overflow-hidden shadow-glow border border-white/10">
              {genResult.type === 'image' ? <img src={genResult.url} className="w-full h-auto" alt="Genesis" /> : <video src={genResult.url} controls autoPlay loop className="w-full h-auto" />}
            </div>
            <div className="mt-16 orbitron text-white/20 text-[12px] tracking-[24px] uppercase font-bold">STARK_GENESIS_XLII</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from { transform: translate(-50%, 40px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .text-glow-premium { text-shadow: 0 0 20px rgba(34,211,238,0.8); }
        .shadow-glow { box-shadow: 0 0 40px rgba(34,211,238,0.4); }
      `}</style>
    </div>
  );
}

export default App;
