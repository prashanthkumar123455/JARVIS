
export enum JarvisStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}

export type VoicePersona = 'JARVIS' | 'FRIDAY' | 'JOCASTA' | 'ANNIE' | 'FENRIR' | 'PETER' | 'EDITH' | 'VISION' | 'MORGAN' | 'GIDEON' | 'COLSON' | 'HELEN' | 'ULTRON';

export interface JarvisLog {
  id: string;
  timestamp: Date;
  source: 'SYSTEM' | 'USER' | 'JARVIS';
  message: string;
}

export interface SearchHistoryEntry {
  id: string;
  timestamp: string;
  query: string;
  response: string;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface GroundingSource {
  title?: string;
  uri: string;
}

export interface HardwareStatus {
  batteryLevel: number;
  isCharging: boolean;
  memory: number;
  connection: string;
  downlink: number;
  cpuCores: number;
  platform: string;
  userAgent: string;
  lat: number | null;
  lng: number | null;
  language: string;
  roastMode: boolean;
  subsystems: {
    firewall: 'ACTIVE' | 'OFFLINE';
    cooling: 'OPTIMAL' | 'CRITICAL';
    powerGrid: 'STABLE' | 'AUXILIARY';
  };
}
