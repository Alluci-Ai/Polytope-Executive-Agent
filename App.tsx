
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { 
  AlluciGeminiService, 
  decode, 
  decodeAudioData,
  FilePart,
  GroundingSource
} from './geminiService';
import { 
  clamp01,
  SkillVerifier
} from './alluciCore';
import { AuditEntry, PersonalityTraits, Connection, AuthType, SkillManifest, ApiManifoldKeys, AutonomyLevel } from './types';

// [ CONFIGURATION_NODE ]: Replace this with your valid Google Client ID
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const DAEMON_URL = 'http://localhost:8000';

declare global {
  interface Window {
    google: any;
  }
}

// Helper to decode JWT (ID Token) without external libs
const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const AuthPortal: React.FC<{ 
  connection: Connection; 
  onComplete: (alias: string, profileImg?: string) => void; 
  onCancel: () => void;
}> = ({ connection, onComplete, onCancel }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsVerifying(true);
      setTimeout(() => {
        onComplete(
          `active_${connection.id.toLowerCase()}_session`, 
          `https://api.dicebear.com/7.x/identicon/svg?seed=${connection.id}`
        );
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
       <div className="facet w-full max-w-md bg-white p-6 md:p-10 border-2 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="h-1.5 w-full flex absolute top-0 left-0">
             <div className="h-full bg-sovereign flex-1" />
             <div className="h-full bg-agent flex-1" />
             <div className="h-full bg-tension flex-1" />
             <div className="h-full bg-flux flex-1" />
          </div>
          
          <div className="flex justify-between items-center border-b border-sovereign pb-6 mb-8 mt-2">
             <div className="flex flex-col">
               <span className="baunk-style text-[12px] md:text-[14px] tracking-[0.4em]">SECURE_HANDSHAKE</span>
               <span className="text-[8px] font-mono opacity-40 uppercase">{connection.name} Manifold</span>
             </div>
             <button onClick={onCancel} className="text-zinc hover:text-black transition-colors px-2 py-1">✕</button>
          </div>

          <div className="flex flex-col gap-6">
            {!isVerifying ? (
              <>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-zinc/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc/10">
                     <span className="text-2xl font-bold">{connection.name.slice(0, 1)}</span>
                  </div>
                  <h3 className="text-[12px] font-sans font-bold">Initiate {connection.name} Bridge</h3>
                  <p className="text-[10px] opacity-60 max-w-[280px] mx-auto mt-2 leading-relaxed">
                    Connecting via <span className="text-agent font-bold">{connection.authType}</span> protocol. 
                    Best practices for data isolation and end-to-end encryption are enforced.
                  </p>
                </div>

                <button 
                  disabled={isLoading}
                  onClick={handleAuth}
                  className={`w-full p-4 baunk-style text-[10px] flex items-center justify-center gap-3 transition-all ${isLoading ? 'bg-zinc text-white animate-pulse' : 'bg-sovereign text-white hover:bg-agent'}`}
                >
                  {isLoading ? '[ NEGOTIATING... ]' : '[ AUTHORIZE_ONE_TOUCH ]'}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 py-4">
                 <div className="relative">
                   <div className="w-20 h-20 rounded-full border-4 border-agent animate-ping absolute opacity-20" />
                   <div className="w-20 h-20 rounded-full border-2 border-agent flex items-center justify-center">
                     <svg className="w-10 h-10 text-agent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                     </svg>
                   </div>
                 </div>
                 <div className="text-[10px] font-mono text-center tracking-widest text-agent uppercase animate-pulse">
                   Biometric_Verification_In_Progress
                 </div>
                 <div className="text-[8px] opacity-40 font-mono">ENCRYPTING_SESSION_TOKEN...</div>
              </div>
            )}
          </div>
       </div>
    </div>
  );
};

const RealtimeBarVisualizer: React.FC<{ 
  value: number; 
  label: string; 
  color: string; 
  height?: number;
}> = ({ value, label, color, height = 4 }) => {
  const segments = 24;
  const activeSegments = Math.floor(value * segments);
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center baunk-style text-[6px] tracking-widest opacity-60">
        <span>{label}</span>
        <span className="font-mono">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="flex gap-[1px]" style={{ height: `${height}px` }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div 
            key={i} 
            className="flex-1 transition-all duration-500 ease-out"
            style={{ 
              backgroundColor: i < activeSegments ? color : 'rgba(161, 161, 161, 0.1)',
              boxShadow: i < activeSegments ? `0 0 4px ${color}44` : 'none'
            }}
          />
        ))}
      </div>
    </div>
  );
};

const PolytopeIdentity: React.FC<{ color: string; size?: number; active?: boolean }> = ({ color, size = 48, active }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={`transition-all duration-700 ${active ? 'scale-110 drop-shadow-[0_0_12px_rgba(145,214,95,0.4)]' : 'scale-100 opacity-60'}`}>
    <path d="M11 26L89 8L45 42L11 26Z" fill={color} fillOpacity="1" />
    <path d="M89 8L74 92L45 42L89 8Z" fill={color} fillOpacity="0.8" />
    <path d="M74 92L11 26L45 42L74 92Z" fill={color} fillOpacity="0.6" />
  </svg>
);

const CircularVisualizer: React.FC<{ stream: MediaStream | null; active: boolean; accent: string }> = ({ stream, active, accent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  useEffect(() => {
    if (!stream || !active) return;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      const { width, height } = canvas;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3.5;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * radius * 0.7;
        const angle = (i / bufferLength) * Math.PI * 2;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.lineTo(centerX + Math.cos(angle) * (radius + barHeight), centerY + Math.sin(angle) * (radius + barHeight));
        ctx.stroke();
      }
    };
    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioCtx.close();
    };
  }, [stream, active, accent]);
  return <canvas ref={canvasRef} width={400} height={400} className="w-full h-full object-contain" />;
};

interface Message {
  text: string;
  isUser: boolean;
  sources?: GroundingSource[];
}

interface PendingAttachment extends FilePart {
  name: string;
}

type MobileView = 'terminal' | 'vision' | 'system';

const MobileNav: React.FC<{ active: MobileView; setActive: (v: MobileView) => void }> = ({ active, setActive }) => (
  <nav className="md:hidden flex h-14 border-t border-sovereign bg-white z-40 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
    <button onClick={() => setActive('vision')} className={`flex-1 flex flex-col items-center justify-center gap-1 baunk-style text-[8px] transition-colors ${active === 'vision' ? 'bg-sovereign text-white' : 'text-zinc hover:bg-zinc/5'}`}>
      <span>[ VISION ]</span>
    </button>
    <button onClick={() => setActive('terminal')} className={`flex-1 flex flex-col items-center justify-center gap-1 baunk-style text-[8px] transition-colors border-x border-sovereign/10 ${active === 'terminal' ? 'bg-sovereign text-white' : 'text-zinc hover:bg-zinc/5'}`}>
      <span>[ TERMINAL ]</span>
    </button>
    <button onClick={() => setActive('system')} className={`flex-1 flex flex-col items-center justify-center gap-1 baunk-style text-[8px] transition-colors ${active === 'system' ? 'bg-sovereign text-white' : 'text-zinc hover:bg-zinc/5'}`}>
      <span>[ SYSTEM ]</span>
    </button>
  </nav>
);

const MobileMenu: React.FC<{ isOpen: boolean; onClose: () => void; onAction: (action: string) => void }> = ({ isOpen, onClose, onAction }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl flex flex-col p-8 gap-6 animate-in fade-in duration-200">
       <div className="flex justify-between items-center border-b border-sovereign pb-4">
          <span className="baunk-style text-lg tracking-widest">[ MENU ]</span>
          <button onClick={onClose} className="text-xl p-2">✕</button>
       </div>
       <div className="flex flex-col gap-3 text-center overflow-y-auto">
          <button onClick={() => onAction('audit')} className="alce-button baunk-style text-xs py-4 border-b border-zinc/10">[ AUDIT_LOG ]</button>
          <button onClick={() => onAction('files')} className="alce-button baunk-style text-xs py-4 border-b border-zinc/10">[ FILES ]</button>
          <button onClick={() => onAction('skills')} className="alce-button baunk-style text-xs py-4 border-b border-zinc/10">[ SKILLS ]</button>
          <button onClick={() => onAction('bridges')} className="alce-button baunk-style text-xs py-4 border-b border-zinc/10">[ BRIDGES ]</button>
          <button onClick={() => onAction('api')} className="alce-button baunk-style text-xs py-4 border-b border-zinc/10">[ API_KEYS ]</button>
          <button onClick={() => onAction('soul')} className="alce-button baunk-style text-xs py-4">[ SOUL_CORE ]</button>
       </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [daemonStatus, setDaemonStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  
  // Mobile Responsiveness States
  const [mobileView, setMobileView] = useState<MobileView>('terminal');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSoulOpen, setIsSoulOpen] = useState(false);
  const [isApiManifoldOpen, setIsApiManifoldOpen] = useState(false);
  
  const [activeAuth, setActiveAuth] = useState<Connection | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);
  
  // Affective states
  const [userEmotional, setUserEmotional] = useState(0.4);
  const [userPhysical, setUserPhysical] = useState(0.3);
  const [userCognitive, setUserCognitive] = useState(0.6);
  const [agentEmotional, setAgentEmotional] = useState(0.2); 
  const [agentPhysical, setAgentPhysical] = useState(0.5); 
  const [agentCognitive, setAgentCognitive] = useState(0.9); 
  const [valenceCurvature, setValenceCurvature] = useState(0.3);
  const [manifoldIntegrity, setManifoldIntegrity] = useState(0.12);

  const [transcriptions, setTranscriptions] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const [personality, setPersonality] = useState<PersonalityTraits>({
    satireLevel: 0.5,
    analyticalDepth: 0.8,
    protectiveBias: 0.9,
    verbosity: 0.4
  });

  const [apiKeys, setApiKeys] = useState<ApiManifoldKeys>(() => {
    const saved = localStorage.getItem('alluci_api_keys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved API keys", e);
      }
    }
    return {
      llm: { openai: '', anthropic: '', googleCloud: '', groq: '' },
      audio: { openaiRealtime: '', elevenLabsAgents: '', retellAi: '', inworldAi: '' },
      music: { suno: '', elevenLabsMusic: '', stableAudio: '', soundverse: '' },
      image: { openaiDalle: '', falAi: '', midjourney: '', adobeFirefly: '' },
      video: { runway: '', luma: '', heygen: '', livepeer: '' }
    };
  });

  useEffect(() => {
    localStorage.setItem('alluci_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  const [connections, setConnections] = useState<Connection[]>([
    { id: 'icloud', name: 'iCloud', status: 'DISCONNECTED', type: 'WORKSPACE', authType: 'TOKEN', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: false },
    { id: 'imessage', name: 'iMessage', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'SECURE_TUNNEL', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'iwatch', name: 'iWatch', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'SECURE_TUNNEL', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'iphone', name: 'iPhone', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'SECURE_TUNNEL', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'wa', name: 'WhatsApp', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'QR_SYNC', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'tg', name: 'Telegram', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'TOKEN', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'sl', name: 'Slack', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'dc', name: 'Discord', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'sg', name: 'Signal', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'TOKEN', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'ig', name: 'Instagram', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'fb', name: 'Facebook', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'x', name: 'X', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'mt', name: 'MS Teams', status: 'DISCONNECTED', type: 'WORKSPACE', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'webchat', name: 'WebChat', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'WEB_SESSION', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: false },
    { id: 'wechat', name: 'WeChat', status: 'DISCONNECTED', type: 'MESSAGING', authType: 'QR_SYNC', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'gm', name: 'Gmail', status: 'DISCONNECTED', type: 'WORKSPACE', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'gd', name: 'G-Drive', status: 'DISCONNECTED', type: 'WORKSPACE', authType: 'OAUTH2', autonomyLevel: AutonomyLevel.RESTRICTED, isEncrypted: true },
    { id: 'verus', name: 'VerusID', status: 'DISCONNECTED', type: 'WORKSPACE', authType: 'IDENTITY_LINK', autonomyLevel: AutonomyLevel.SOVEREIGN, isEncrypted: true }
  ]);

  const skillVerifier = useRef(new SkillVerifier());
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const geminiServiceRef = useRef<AlluciGeminiService | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Poll Daemon Status
  useEffect(() => {
    const checkDaemon = async () => {
      try {
        const res = await fetch(`${DAEMON_URL}/system/status`);
        if (res.ok) setDaemonStatus('ONLINE');
        else setDaemonStatus('OFFLINE');
      } catch (e) {
        setDaemonStatus('OFFLINE');
      }
    };
    checkDaemon();
    const interval = setInterval(checkDaemon, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    geminiServiceRef.current = new AlluciGeminiService();
    return () => {
      geminiServiceRef.current?.disconnect();
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Auto-scroll logic: only if near bottom or if message is user's
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
      if (isAtBottom || (transcriptions.length > 0 && transcriptions[transcriptions.length-1].isUser)) {
         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [transcriptions, isProcessing, mobileView]);

  useEffect(() => {
    const drift = setInterval(() => {
      if (isConnected) {
        setValenceCurvature(a => clamp01(a + (Math.random() - 0.5) * 0.02));
        setManifoldIntegrity(t => clamp01(t + (Math.random() - 0.5) * 0.02));
        setUserEmotional(v => clamp01(v + (Math.random() - 0.5) * 0.03));
        setAgentEmotional(v => clamp01(v + (Math.random() - 0.5) * 0.01));
        setUserPhysical(v => clamp01(v + (Math.random() - 0.5) * 0.04));
        setUserCognitive(v => clamp01(v + (Math.random() - 0.5) * 0.02));
        setAgentPhysical(v => clamp01(v + (Math.random() - 0.5) * 0.02));
        setAgentCognitive(v => clamp01(v + (Math.random() - 0.5) * 0.01));
      }
    }, 1000);
    return () => clearInterval(drift);
  }, [isConnected]);

  const refreshAuditLog = useCallback(() => {
    if (geminiServiceRef.current) setAuditLog(geminiServiceRef.current.audit.getEntries());
  }, []);

  const handleAudioOutput = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
    const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    sourcesRef.current.add(source);
    setValenceCurvature(prev => clamp01(prev + 0.15));
  }, []);

  const handleConnect = async () => {
    if (isConnected) {
      geminiServiceRef.current?.disconnect();
      setIsConnected(false);
      setAudioStream(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      geminiServiceRef.current?.setPersonality(personality);
      geminiServiceRef.current?.setConnections(connections);
      await geminiServiceRef.current?.connect({
        onAudioOutput: handleAudioOutput,
        onTranscription: (text, isUser) => {
          setTranscriptions(prev => {
            const last = prev[prev.length - 1];
            if (last && last.isUser === isUser) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, text: last.text + text };
              return updated;
            } else {
              return [...prev.slice(-49), { text, isUser }];
            }
          });
          refreshAuditLog();
        },
        onInterrupted: () => {
          sourcesRef.current.forEach(s => s.stop());
          sourcesRef.current.clear();
          nextStartTimeRef.current = 0;
        },
        onOpen: () => { setIsConnected(true); refreshAuditLog(); },
        onClose: () => setIsConnected(false),
        onError: (err) => console.error(err),
        onGroundingSources: (sources) => {
          setTranscriptions(prev => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (!next[i].isUser) {
                next[i].sources = sources;
                break;
              }
            }
            return next;
          });
        }
      });
    } catch (err) { console.error(err); }
  };

  const startAuthFlow = (conn: Connection) => {
    if (conn.status === 'CONNECTED') {
      setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, status: 'DISCONNECTED', accountAlias: undefined, profileImg: undefined } : c));
      return;
    }
    setActiveAuth(conn);
  };

  const handleAuthComplete = (alias: string, profileImg?: string) => {
    if (!activeAuth) return;
    const connId = activeAuth.id;
    setConnections(prev => prev.map(c => c.id === connId ? { ...c, status: 'CONNECTED', accountAlias: alias, profileImg } : c));
    setActiveAuth(null);
  };

  const toggleCamera = async () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        frameIntervalRef.current = window.setInterval(() => {
          if (canvasRef.current && isConnected) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.drawImage(videoRef.current!, 0, 0, 320, 240);
            geminiServiceRef.current?.sendVideoFrame(canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1]);
          }
        }, 1500);
      }
    } catch (err) { console.error(err); }
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && attachments.length === 0) return;
    if (isProcessing) return;

    const currentText = textInput;
    const currentAttachments = [...attachments];

    setTranscriptions(prev => [...prev, { text: currentText, isUser: true }]);
    setTextInput("");
    setAttachments([]);
    setIsProcessing(true);

    try {
      if (geminiServiceRef.current) {
        const responseText = await geminiServiceRef.current.processMultimodal(currentText, currentAttachments);
        setTranscriptions(prev => [...prev, { text: responseText, isUser: false }]);
        
        // Optionally speak the response if connected
        if (isConnected) {
          await geminiServiceRef.current.speak(responseText, handleAudioOutput);
        }
      }
    } catch (err) {
      console.error(err);
      setTranscriptions(prev => [...prev, { text: "[ ERROR ]: Communication manifold disrupted.", isUser: false }]);
    } finally {
      setIsProcessing(false);
      refreshAuditLog();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: PendingAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(file);
      const data = await base64Promise;
      newAttachments.push({ name: file.name, data, mimeType: file.type });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleToggleSkill = (id: string) => {
    skillVerifier.current.toggleSkill(id);
    // Force re-render to reflect verified state
    setIsSettingsOpen(false);
    setTimeout(() => setIsSettingsOpen(true), 10);
  };

  const handleMobileMenuAction = (action: string) => {
    setIsMobileMenuOpen(false);
    switch(action) {
      case 'audit': setIsAuditOpen(true); refreshAuditLog(); break;
      case 'files': setIsDriveOpen(true); break;
      case 'skills': setIsSettingsOpen(true); break;
      case 'bridges': setIsPreferencesOpen(true); break;
      case 'api': setIsApiManifoldOpen(true); break;
      case 'soul': setIsSoulOpen(true); break;
    }
  };

  const updateApiKey = (category: keyof ApiManifoldKeys, provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [provider]: value
      }
    }));
  };

  const accentColor = isConnected ? '#91D65F' : '#A1A1A1';

  // Group connections by type for cleaner Bridge Directory UI
  const groupedConnections = {
    'APPLE_ECOSYSTEM': connections.filter(c => ['icloud', 'imessage', 'iwatch', 'iphone'].includes(c.id)),
    'SOCIAL_MANIFOLD': connections.filter(c => ['wa', 'tg', 'dc', 'sg', 'ig', 'fb', 'x'].includes(c.id)),
    'ENTERPRISE_CORE': connections.filter(c => ['sl', 'mt', 'gm', 'gd', 'webchat', 'wechat'].includes(c.id)),
    'VERUS_IDENTITY': connections.filter(c => ['verus'].includes(c.id))
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-white flex flex-col md:grid md:grid-cols-12 md:gap-[2px] md:p-[2px] simplicial-grid">
      {activeAuth && <AuthPortal connection={activeAuth} onComplete={handleAuthComplete} onCancel={() => setActiveAuth(null)} />}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} onAction={handleMobileMenuAction} />

      {/* Header */}
      <header className="facet col-span-full h-14 md:h-16 flex items-center px-4 md:px-6 justify-between z-50 border-b md:border border-sovereign bg-white shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
           <PolytopeIdentity color={accentColor} size={24} active={isConnected} />
           <div className="flex flex-col">
             <h1 className="baunk-style text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em]">[ POLYTOPE ] v4.3</h1>
             <span className="text-[6px] font-mono opacity-30 uppercase tracking-tighter hidden md:block">Autonomous_Executive_Manifold</span>
           </div>
        </div>
        
        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[6px] font-mono tracking-widest opacity-60">DAEMON_STATUS</span>
            <span className={`text-[8px] font-bold ${daemonStatus === 'ONLINE' ? 'text-agent' : 'text-tension'}`}>
              [{daemonStatus}]
            </span>
          </div>
          <button onClick={() => { setIsAuditOpen(true); refreshAuditLog(); }} className="alce-button text-[8px] baunk-style hidden lg:block">[ AUDIT ]</button>
          <button onClick={() => setIsDriveOpen(!isDriveOpen)} className="alce-button text-[8px] baunk-style hidden lg:block">[ FILES ]</button>
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="alce-button text-[8px] baunk-style">[ SKILLS ]</button>
          <button onClick={() => setIsPreferencesOpen(true)} className="alce-button text-[8px] baunk-style">[ BRIDGES ]</button>
          <button onClick={() => setIsApiManifoldOpen(true)} className="alce-button text-[8px] baunk-style">[ API ]</button>
          <button onClick={() => setIsSoulOpen(true)} className="alce-button text-[8px] baunk-style">[ SOUL ]</button>
          <button onClick={handleConnect} className={`alce-button text-[9px] baunk-style px-6 ${isConnected ? 'text-tension' : 'text-agent'}`}>
             {isConnected ? '[ SLEEP ]' : '[ AWAKEN ]'}
          </button>
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-3">
          <button onClick={handleConnect} className={`alce-button text-[8px] baunk-style px-3 py-1.5 ${isConnected ? 'text-tension' : 'text-agent'}`}>
             {isConnected ? '[ SLEEP ]' : '[ AWAKEN ]'}
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} className="alce-button baunk-style text-[10px] px-3 py-1.5 border-l border-sovereign">
            ☰
          </button>
        </div>
      </header>

      {/* Left Sidebar / Vision Tab */}
      <aside className={`md:col-span-3 bg-zinc/5 overflow-y-auto scrollbar-hide md:border-r border-sovereign flex flex-col ${mobileView === 'vision' ? 'flex-1' : 'hidden md:flex'}`}>
         <div className="facet flex-none h-48 md:h-64 lg:h-48 p-4 border-none">
            <div className="flex-1 bg-white relative border border-sovereign overflow-hidden">
               <CircularVisualizer stream={audioStream} active={isConnected} accent={accentColor} />
               <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover grayscale opacity-0 ${isCameraActive ? 'opacity-40' : ''}`} />
            </div>
            <button onClick={toggleCamera} className="alce-button baunk-style text-[7px] mt-4 w-full">{isCameraActive ? '[ CLOSE_VISION ]' : '[ OPEN_PROBE ]'}</button>
         </div>
         
         <div className="flex-1 p-6 flex flex-col gap-8 scrollbar-hide bg-white/50 backdrop-blur-sm border-t border-sovereign/10">
            <h3 className="baunk-style text-[8px] opacity-40 border-b border-sovereign pb-1 text-center">Affective_Engine_v4.3</h3>
            
            <div className="flex flex-col gap-6">
              <div className="space-y-4 bg-zinc/5 p-3 border border-sovereign/5">
                <span className="baunk-style text-[6px] opacity-30 block mb-1">User_Resonance_Manifold</span>
                <RealtimeBarVisualizer label="Resonance" value={userEmotional} color="#000000" />
                <RealtimeBarVisualizer label="Physical" value={userPhysical} color="#FF7D00" />
                <RealtimeBarVisualizer label="Emotional" value={userEmotional} color="#995CC0" />
                <RealtimeBarVisualizer label="Cognitive" value={userCognitive} color="#91D65F" />
              </div>

              <div className="space-y-4 bg-agent/5 p-3 border border-agent/10">
                <span className="baunk-style text-[6px] opacity-30 block mb-1">System_Coherence_Manifold</span>
                <RealtimeBarVisualizer label="System_Coherence" value={agentCognitive} color="#91D65F" />
                <RealtimeBarVisualizer label="Valence_Curvature" value={valenceCurvature} color="#995CC0" />
                <RealtimeBarVisualizer label="Manifold_Integrity" value={manifoldIntegrity} color="#FF7D00" />
              </div>
            </div>
         </div>
      </aside>

      {/* Main / Terminal Tab */}
      <main className={`md:col-span-6 facet relative md:border-none flex flex-col min-h-0 ${mobileView === 'terminal' ? 'flex-1' : 'hidden md:flex'}`}>
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 scrollbar-hide bg-white">
          {transcriptions.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-5 select-none animate-pulse">
              <PolytopeIdentity color="#000" size={100} />
              <h2 className="baunk-style text-[8px] mt-6 tracking-[1.2em]">EXECUTIVE_SESSION_IDLE</h2>
            </div>
          )}
          {transcriptions.map((t, i) => (
            <div key={i} className={`flex flex-col ${t.isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
               <span className="text-[6px] baunk-style mb-1 opacity-30 tracking-widest">{t.isUser ? 'USER_PROJECTION' : 'ALLUCI_EXECUTIVE'}</span>
               <div className={`max-w-[90%] md:max-w-[85%] px-4 md:px-5 py-3 md:py-4 text-[11px] md:text-[12px] border font-mono leading-relaxed ${t.isUser ? 'bg-white border-zinc/20' : 'bg-agent/5 border-agent/20'}`}>
                 {t.text}
                 {t.sources && t.sources.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-agent/10 flex flex-wrap gap-2">
                      <span className="baunk-style text-[6px] opacity-40 w-full mb-1">Grounding_Context_Retrieved</span>
                      {t.sources.map((s, idx) => (
                        <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-agent/10 hover:bg-agent/30 text-agent px-2 py-1 border border-agent/20 no-underline transition-all uppercase font-bold">
                          {s.title.slice(0, 20)}...
                        </a>
                      ))}
                   </div>
                 )}
               </div>
            </div>
          ))}
          {isProcessing && <div className="text-[8px] baunk-style text-flux animate-pulse tracking-[0.5em] py-2">ALLUCI_CORE_CALCULATING_TRAJECTORY...</div>}
          <div ref={messagesEndRef} className="h-2 flex-none" />
        </div>
        
        <form onSubmit={handleCommandSubmit} className="shrink-0 p-3 md:p-4 border-t border-sovereign bg-zinc/5 flex flex-col gap-2 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-10">
           {attachments.length > 0 && (
             <div className="flex flex-wrap gap-2 mb-1">
               {attachments.map((file, idx) => (
                 <div key={idx} className="flex items-center gap-2 bg-white border border-sovereign/10 px-3 py-1.5 text-[7px] font-mono group animate-in slide-in-from-left-2">
                   <span className="opacity-40">{file.mimeType.split('/')[0].toUpperCase()}</span>
                   <span className="truncate max-w-[150px] font-bold">{file.name}</span>
                   <button type="button" onClick={() => removeAttachment(idx)} className="text-tension hover:text-black transition-colors px-1 font-bold">✕</button>
                 </div>
               ))}
             </div>
           )}
           <div className="flex gap-2 md:gap-3 items-end">
             <div className="flex gap-1">
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Ingest Data" className="alce-button baunk-style text-[14px] h-10 w-10 md:h-12 md:w-12 p-0 flex items-center justify-center transition-transform active:scale-95 bg-white">+</button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
             </div>
             <textarea 
               value={textInput} 
               onChange={(e) => setTextInput(e.target.value)} 
               onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommandSubmit(e); } }} 
               placeholder="EXECUTIVE_COMMAND..." 
               className="flex-1 bg-white border border-sovereign/10 focus:border-sovereign transition-colors text-xs tracking-widest font-medium p-3 md:p-4 resize-none scrollbar-hide h-10 md:h-12 rounded-none" 
             />
             <button type="submit" className="alce-button baunk-style text-[9px] md:text-[10px] h-10 md:h-12 px-4 md:px-8 flex items-center justify-center bg-white">[ TRANSMIT ]</button>
           </div>
        </form>
      </main>

      {/* Right Sidebar / System Tab */}
      <aside className={`md:col-span-3 p-4 md:p-6 bg-zinc/5 overflow-hidden border-l border-sovereign flex flex-col gap-6 ${mobileView === 'system' ? 'flex-1' : 'hidden md:flex'}`}>
         <h3 className="baunk-style text-[8px] opacity-40 border-b border-sovereign pb-1 text-center">Audit_Chain_v4.3</h3>
         <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 text-[7px]">
            {auditLog.slice(0, 15).map((e, i) => (
              <div key={i} className="flex flex-col border-l-2 border-sovereign/10 pl-3 py-2 bg-white/30 mb-1 animate-in slide-in-from-right-2">
                 <span className="opacity-40 font-mono text-[6px] mb-1">{e.timestamp}</span>
                 <span className="font-bold uppercase tracking-widest text-[8px]">{e.event}</span>
                 <span className="truncate opacity-60 italic font-mono mt-1">{JSON.stringify(e.details)}</span>
              </div>
            ))}
            <button onClick={() => { setIsAuditOpen(true); refreshAuditLog(); }} className="alce-button baunk-style text-[7px] mt-4 w-full bg-white">[ VIEW_FULL_CHAIN ]</button>
         </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <MobileNav active={mobileView} setActive={setMobileView} />

      <footer className="facet hidden md:flex col-span-full h-8 items-center justify-center bg-zinc/5 border-t border-sovereign text-[7px] baunk-style opacity-30 tracking-[2em] font-bold">
         ALLUCI_EXECUTIVE_OS_v4.3_STABLE_SOVEREIGN_PROTOCOL
      </footer>

      {/* Unified Modal Layer - Responsive */}
      {(isAuditOpen || isPreferencesOpen || isSettingsOpen || isDriveOpen || isSoulOpen || isApiManifoldOpen) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm p-0 md:p-6 flex items-end md:items-center justify-center animate-in fade-in duration-300">
           <div className="facet w-full h-[100dvh] md:h-[90vh] md:w-full md:max-w-6xl bg-white shadow-2xl flex flex-col border-t-2 md:border-2 border-sovereign overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 relative">
              <header className="p-4 md:p-8 border-b border-sovereign flex justify-between items-center bg-white z-[120]">
                 <div className="flex flex-col">
                   <h2 className="baunk-style text-xs md:text-lg tracking-[0.2em] md:tracking-[0.5em] truncate max-w-[200px] md:max-w-none">
                     {isAuditOpen ? 'EXECUTIVE_LEDGER' : isSettingsOpen ? 'SKILL_MANIFEST' : isPreferencesOpen ? 'BRIDGE_DIRECTORY' : isDriveOpen ? 'FILE_MANIFOLD' : isSoulOpen ? 'SOUL_PREFERENCES' : isApiManifoldOpen ? 'API_MANIFOLD_PREFERENCES' : ''}
                   </h2>
                   <span className="text-[6px] md:text-[8px] font-mono opacity-30 uppercase mt-1">Sovereign_Protocol_v4.3_Active</span>
                 </div>
                 <button onClick={() => { setIsAuditOpen(false); setIsPreferencesOpen(false); setIsSettingsOpen(false); setIsDriveOpen(false); setIsSoulOpen(false); setIsApiManifoldOpen(false); setSelectedSkill(null); }} className="alce-button baunk-style text-[9px] md:text-[10px] hover:bg-tension px-4 md:px-10 py-2">[ EXIT ]</button>
              </header>
              <div className="flex-1 overflow-y-auto p-4 md:p-10 scrollbar-hide relative">
                 {isApiManifoldOpen ? (
                    <div className="flex flex-col gap-12 pb-20">
                      <div className="p-6 bg-agent/5 border border-agent/20 text-[10px] font-mono leading-relaxed mb-6">
                        <p className="font-bold text-agent mb-2 uppercase tracking-[0.2em]">Security Protocol Awareness:</p>
                        <p>All API keys entered here are stored within your local Sovereign Manifold (localStorage). They grant Alluci autonomous reach into your subscription silos for Text Reasoning, Audio, Music, Image, and Video synthesis. Ensure your project environments are secure.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Section 1: LLM Reasoning */}
                        <div className="space-y-6">
                          <h3 className="baunk-style text-[10px] text-sovereign border-b border-sovereign/20 pb-2">1. LLM_REASONING_&_LOGIC</h3>
                          {[
                            { id: 'openai', label: 'OpenAI (GPT-5.1 / o1)' },
                            { id: 'anthropic', label: 'Anthropic (Claude 4.5 / 4.6)' },
                            { id: 'googleCloud', label: 'Google Cloud (Gemini 3)' },
                            { id: 'groq', label: 'Groq (High-Speed)' }
                          ].map(item => (
                            <div key={item.id} className="space-y-2">
                              <label className="text-[7px] baunk-style opacity-50 block">{item.label}</label>
                              <input 
                                type="password" 
                                value={apiKeys.llm[item.id as keyof typeof apiKeys.llm]}
                                onChange={(e) => updateApiKey('llm', item.id, e.target.value)}
                                placeholder="ENTER_TOKEN..."
                                className="w-full bg-zinc/5 border border-zinc/20 p-2 text-[9px] font-mono focus:border-agent outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Section 2: Conversational Audio */}
                        <div className="space-y-6">
                          <h3 className="baunk-style text-[10px] text-agent border-b border-agent/20 pb-2">2. CONVERSATIONAL_AUDIO</h3>
                          {[
                            { id: 'openaiRealtime', label: 'OpenAI Realtime API' },
                            { id: 'elevenLabsAgents', label: 'ElevenLabs (Agents API)' },
                            { id: 'retellAi', label: 'Retell AI (Telephony)' },
                            { id: 'inworldAi', label: 'Inworld AI (Character)' }
                          ].map(item => (
                            <div key={item.id} className="space-y-2">
                              <label className="text-[7px] baunk-style opacity-50 block">{item.label}</label>
                              <input 
                                type="password" 
                                value={apiKeys.audio[item.id as keyof typeof apiKeys.audio]}
                                onChange={(e) => updateApiKey('audio', item.id, e.target.value)}
                                placeholder="ENTER_TOKEN..."
                                className="w-full bg-zinc/5 border border-zinc/20 p-2 text-[9px] font-mono focus:border-agent outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Section 3: Music Creation */}
                        <div className="space-y-6">
                          <h3 className="baunk-style text-[10px] text-flux border-b border-flux/20 pb-2">3. MUSIC_SYNTHESIS</h3>
                          {[
                            { id: 'suno', label: 'Suno API (Vocals/Melody)' },
                            { id: 'elevenLabsMusic', label: 'ElevenLabs Music API' },
                            { id: 'stableAudio', label: 'Stable Audio (Stability AI)' },
                            { id: 'soundverse', label: 'Soundverse (functional)' }
                          ].map(item => (
                            <div key={item.id} className="space-y-2">
                              <label className="text-[7px] baunk-style opacity-50 block">{item.label}</label>
                              <input 
                                type="password" 
                                value={apiKeys.music[item.id as keyof typeof apiKeys.music]}
                                onChange={(e) => updateApiKey('music', item.id, e.target.value)}
                                placeholder="ENTER_TOKEN..."
                                className="w-full bg-zinc/5 border border-zinc/20 p-2 text-[9px] font-mono focus:border-agent outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Section 4: Image Creation */}
                        <div className="space-y-6">
                          <h3 className="baunk-style text-[10px] text-tension border-b border-tension/20 pb-2">4. IMAGE_MANIFESTATION</h3>
                          {[
                            { id: 'openaiDalle', label: 'OpenAI (DALL·E 3)' },
                            { id: 'falAi', label: 'Fal.ai (Fast Diffusion)' },
                            { id: 'midjourney', label: 'Midjourney (Alpha API)' },
                            { id: 'adobeFirefly', label: 'Adobe Firefly API' }
                          ].map(item => (
                            <div key={item.id} className="space-y-2">
                              <label className="text-[7px] baunk-style opacity-50 block">{item.label}</label>
                              <input 
                                type="password" 
                                value={apiKeys.image[item.id as keyof typeof apiKeys.image]}
                                onChange={(e) => updateApiKey('image', item.id, e.target.value)}
                                placeholder="ENTER_TOKEN..."
                                className="w-full bg-zinc/5 border border-zinc/20 p-2 text-[9px] font-mono focus:border-agent outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Section 5: Video Creation */}
                        <div className="space-y-6">
                          <h3 className="baunk-style text-[10px] text-zinc border-b border-zinc/20 pb-2">5. VIDEO_TEMPORAL_GENESIS</h3>
                          {[
                            { id: 'runway', label: 'Runway (Gen-4.5)' },
                            { id: 'luma', label: 'Luma Dream Machine' },
                            { id: 'heygen', label: 'HeyGen / Synthesia' },
                            { id: 'livepeer', label: 'Livepeer (Decentralized)' }
                          ].map(item => (
                            <div key={item.id} className="space-y-2">
                              <label className="text-[7px] baunk-style opacity-50 block">{item.label}</label>
                              <input 
                                type="password" 
                                value={apiKeys.video[item.id as keyof typeof apiKeys.video]}
                                onChange={(e) => updateApiKey('video', item.id, e.target.value)}
                                placeholder="ENTER_TOKEN..."
                                className="w-full bg-zinc/5 border border-zinc/20 p-2 text-[9px] font-mono focus:border-agent outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-12 pt-12 border-t border-sovereign/10 flex justify-end">
                        <button 
                          onClick={() => {
                            localStorage.setItem('alluci_api_keys', JSON.stringify(apiKeys));
                            setIsApiManifoldOpen(false);
                            geminiServiceRef.current?.audit.addEntry("API_MANIFOLD_PERSISTED", { status: "SUCCESS" });
                            refreshAuditLog();
                          }}
                          className="alce-button baunk-style text-[10px] px-12 py-4 bg-sovereign text-white hover:bg-agent"
                        >
                          [ SAVE_TO_MANIFOLD ]
                        </button>
                      </div>
                    </div>
                 ) : isSoulOpen ? (
                    <div className="flex flex-col gap-8 md:gap-16 py-4 md:py-8">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center">
                          <div className="flex flex-col items-center justify-center space-y-8 py-10 bg-zinc/5 border border-sovereign/5">
                             <PolytopeIdentity color="#91D65F" size={120} active={isConnected} />
                             <div className="text-center">
                                <span className="baunk-style text-[10px] tracking-[0.5em] block opacity-40">Affective_Core_v4.3</span>
                                <h3 className="baunk-style text-xl mt-2">Alluci_Identity_Nexus</h3>
                             </div>
                          </div>
                          <div className="space-y-8 md:space-y-12 px-0 md:px-4">
                             <h3 className="baunk-style text-[12px] border-b border-sovereign pb-1 opacity-50 tracking-[0.3em]">Personality_Calibration_Matrix</h3>
                             <div className="space-y-6 md:space-y-10">
                               {['satireLevel', 'analyticalDepth', 'protectiveBias', 'verbosity'].map(trait => (
                                 <div key={trait} className="group">
                                    <div className="flex justify-between items-center baunk-style text-[9px] mb-4">
                                       <span className="group-hover:text-agent transition-colors">{trait}</span>
                                       <span className="text-agent bg-agent/5 px-2 py-1 font-mono">{(personality as any)[trait].toFixed(2)}</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.01" value={(personality as any)[trait]} onChange={(e) => setPersonality(p => ({ ...p, [trait]: parseFloat(e.target.value) }))} className="w-full h-1 bg-zinc/10 accent-sovereign appearance-none cursor-pointer hover:accent-agent transition-all" />
                                 </div>
                               ))}
                             </div>
                             <div className="p-6 bg-flux/5 border border-flux/20 text-[9px] font-mono leading-relaxed italic opacity-70">
                                Calibration changes propagate in real-time to the latent speech manifold and decision-making logic gates.
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : isPreferencesOpen ? (
                    <div className="flex flex-col gap-16">
                       <div className="grid grid-cols-1 lg:grid-cols-1 gap-16">
                          <div className="flex flex-col">
                             <h3 className="baunk-style text-[12px] border-b border-sovereign pb-1 mb-8 opacity-50 tracking-[0.3em]">Security_&_Trust_Protocol</h3>
                             <div className="p-6 bg-agent/5 border border-agent/20 text-[10px] font-mono leading-relaxed mb-10 space-y-4">
                                <p>● <span className="font-bold">ONE_TOUCH_LOGIN</span>: Enabled for all verified biometric platforms.</p>
                                <p>● <span className="font-bold">E2E_ENCRYPTION</span>: Mandatory for iMessage, Signal, and WhatsApp bridges.</p>
                                <p>● <span className="font-bold">SESSION_ISOLATION</span>: Each bridge operates in a secure Simplicial Vault.</p>
                                <p>● <span className="font-bold">AUTONOMY_LEVEL</span>: Full sovereign execution authorized.</p>
                             </div>
                             <div className="grid grid-cols-2 gap-4 max-w-sm">
                                <button className="alce-button text-[8px] baunk-style w-full bg-sovereign text-white">[ ROTATE_KEYS ]</button>
                                <button className="alce-button text-[8px] baunk-style w-full">[ FLUSH_CACHE ]</button>
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-12 pb-20">
                          {Object.entries(groupedConnections).map(([groupName, groupConns]) => (
                            <div key={groupName}>
                              <h3 className="baunk-style text-[12px] border-b border-sovereign pb-1 mb-8 opacity-50 tracking-[0.3em]">{groupName}</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                 {groupConns.map(conn => (
                                   <div key={conn.id} className={`facet p-6 transition-all duration-300 group hover:shadow-xl ${conn.status === 'CONNECTED' ? 'border-agent' : 'border-zinc/20 hover:border-sovereign'}`}>
                                      <div className="flex justify-between items-start mb-6">
                                         <div className="flex flex-col">
                                           <span className="baunk-style text-[10px] block font-bold mb-1">{conn.name}</span>
                                           <span className="text-[7px] font-mono opacity-40 uppercase">{conn.type}</span>
                                         </div>
                                         <span className={`text-[6px] baunk-style p-1.5 border ${conn.status === 'CONNECTED' ? 'bg-agent text-white border-agent' : 'bg-zinc/5 opacity-40 border-zinc/20'}`}>{conn.authType}</span>
                                      </div>
                                      {conn.status === 'CONNECTED' ? (
                                         <div className="flex items-center gap-3 mb-6 animate-in slide-in-from-top-2">
                                            <div className="relative">
                                              <img src={conn.profileImg || `https://api.dicebear.com/7.x/identicon/svg?seed=${conn.id}`} className="w-10 h-10 rounded-full border border-sovereign/10 grayscale group-hover:grayscale-0 transition-all" alt="" />
                                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-agent rounded-full border-2 border-white" />
                                            </div>
                                            <div className="flex flex-col">
                                              <div className="text-[8px] font-bold font-mono text-sovereign">{conn.accountAlias}</div>
                                              <div className="text-[6px] font-mono opacity-40 uppercase tracking-tighter">Verified Session</div>
                                            </div>
                                         </div>
                                      ) : (
                                        <div className="h-10 mb-6 flex items-center justify-center border border-dashed border-zinc/20 bg-zinc/5">
                                           <span className="text-[7px] font-mono opacity-20 uppercase tracking-widest italic">Signal Offline</span>
                                        </div>
                                      )}
                                      <button 
                                        onClick={() => startAuthFlow(conn)} 
                                        className={`alce-button py-3 text-[8px] w-full baunk-style transition-all ${conn.status === 'CONNECTED' ? 'text-tension border-tension hover:bg-tension hover:text-white' : 'text-sovereign hover:bg-sovereign hover:text-white'}`}
                                      >
                                         {conn.status === 'CONNECTED' ? '[ TERMINATE ]' : '[ ACTIVATE ]'}
                                      </button>
                                   </div>
                                 ))}
                              </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 ) : isAuditOpen ? (
                    <div className="flex flex-col gap-6 font-mono text-[10px]">
                       <div className="hidden md:grid grid-cols-5 gap-4 pb-4 border-b-2 border-sovereign baunk-style text-sovereign text-[9px] tracking-widest">
                          <span>TIMESTAMP</span><span>EVENT_TYPE</span><span>ENTITY</span><span>DETAILS</span><span>MANIFOLD_HASH</span>
                       </div>
                       <div className="space-y-4 md:space-y-2">
                         {auditLog.map((e, i) => (
                           <div key={i} className="flex flex-col md:grid md:grid-cols-5 gap-2 md:gap-4 py-3 md:py-4 border-b border-zinc/10 hover:bg-zinc/5 transition-colors group">
                              <span className="opacity-40 text-[9px] md:text-inherit">{e.timestamp}</span>
                              <span className="font-bold group-hover:text-agent transition-colors">{e.event}</span>
                              <span className="opacity-60 hidden md:block">{e.details.channel || e.details.tool || 'SYSTEM'}</span>
                              <span className="truncate opacity-80 italic">{JSON.stringify(e.details)}</span>
                              <span className="text-agent font-bold text-[9px] md:text-inherit">{e.hash}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                 ) : isSettingsOpen ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {skillVerifier.current.getManifests().map(skill => (
                         <div 
                           key={skill.id} 
                           onClick={() => setSelectedSkill(skill)}
                           className={`facet p-8 border-zinc/10 relative hover:border-agent transition-all duration-500 group cursor-pointer ${!skill.verified ? 'opacity-40 grayscale' : 'shadow-sm'}`}
                         >
                            <div className="flex justify-between items-start mb-6">
                               <div className="flex flex-col">
                                 <span className="baunk-style text-[12px] group-hover:text-agent transition-colors">{skill.name}</span>
                                 <span className="text-[7px] font-mono opacity-30 mt-1 uppercase tracking-tighter">{skill.category} / {skill.id}</span>
                               </div>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleToggleSkill(skill.id); }}
                                 className={`px-3 py-1 text-[8px] baunk-style border ${skill.verified ? 'bg-agent text-white border-agent' : 'bg-white text-zinc border-zinc/20 hover:border-tension hover:text-tension'}`}
                               >
                                  {skill.verified ? '[ ACTIVE ]' : '[ OFFLINE ]'}
                               </button>
                            </div>
                            <div className="space-y-2 mb-6">
                              <span className="text-[7px] baunk-style opacity-30 block">Capabilities:</span>
                              <div className="flex flex-wrap gap-1">
                                {skill.capabilities.map((cap, ci) => (
                                  <span key={ci} className="bg-zinc/5 border border-zinc/10 px-2 py-0.5 text-[7px] font-mono opacity-60 truncate max-w-full">{cap}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[7px] font-mono opacity-20 mt-8 pt-4 border-t border-zinc/5">
                               <span>SIG: {skill.signature}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                 ) : isDriveOpen ? (
                    <div className="flex flex-col items-center justify-center h-full gap-12 py-20">
                       <div className="relative">
                         <div className="absolute inset-0 bg-agent/5 rounded-full blur-3xl scale-150 animate-pulse" />
                         <PolytopeIdentity color="#000" size={160} active={isConnected} />
                       </div>
                       <div className="text-center space-y-4 max-w-xl px-6">
                          <h3 className="baunk-style text-xl tracking-[0.8em]">MANIFOLD_STORAGE_STABLE</h3>
                          <p className="text-[11px] opacity-40 font-mono leading-relaxed">
                            Awaiting sovereign data packets. Integrated iCloud, Google Drive, and MS Teams bridges are prepared for bi-directional synchronization.
                          </p>
                       </div>
                       <button onClick={() => fileInputRef.current?.click()} className="alce-button baunk-style text-[10px] px-20 h-16">[ UPLOAD_DATA_PACKET ]</button>
                    </div>
                 ) : null}
              </div>

              {/* Skill Detail Popup - Anchored smaller centered window */}
              {selectedSkill && (
                <div className="absolute top-0 md:top-24 left-0 md:left-1/2 md:-translate-x-1/2 z-[150] w-full h-full md:h-auto md:w-[90%] max-w-2xl md:max-h-[75vh] bg-white border-2 border-sovereign shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col animate-in slide-in-from-top-10 duration-500">
                  <header className="p-6 border-b border-sovereign flex justify-between items-center bg-white shrink-0">
                    <div className="flex flex-col">
                      <span className="text-agent baunk-style text-[8px] tracking-[0.4em] mb-1">{selectedSkill.category}</span>
                      <h3 className="baunk-style text-sm md:text-base tracking-tighter">{selectedSkill.name}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedSkill(null)} 
                      className="alce-button baunk-style text-[8px] hover:bg-tension border-none font-bold"
                    >
                      [ EXIT ]
                    </button>
                  </header>
                  
                  <div className="flex-1 overflow-y-auto p-8 scrollbar-hide space-y-10">
                    <section className="space-y-4">
                      <h4 className="baunk-style text-[10px] opacity-40 border-b border-sovereign/10 pb-1">Skill_Overview</h4>
                      <p className="text-xs font-mono leading-relaxed opacity-70">{selectedSkill.description}</p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="space-y-3">
                        <h4 className="baunk-style text-[9px] text-agent">Mindsets</h4>
                        <ul className="space-y-2">
                          {selectedSkill.mindsets.map((m, i) => (
                            <li key={i} className="text-[10px] font-mono flex gap-2">
                              <span className="opacity-30">[{i+1}]</span>
                              <span className="uppercase">{m}</span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="space-y-3">
                        <h4 className="baunk-style text-[9px] text-flux">Methodologies</h4>
                        <ul className="space-y-2">
                          {selectedSkill.methodologies.map((m, i) => (
                            <li key={i} className="text-[10px] font-mono flex gap-2">
                              <span className="opacity-30">[{i+1}]</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </div>

                    <section className="space-y-4">
                      <h4 className="baunk-style text-[9px] text-tension">Cognitive_Chains_&_Logic</h4>
                      <div className="bg-zinc/5 p-4 border border-zinc/10 space-y-4">
                        <div className="flex flex-wrap gap-3 items-center">
                          {selectedSkill.chainsOfThought.map((t, i) => (
                            <React.Fragment key={i}>
                              <div className="flex items-center gap-2 text-[9px] font-mono">
                                <span className="bg-sovereign text-white w-4 h-4 rounded-full flex items-center justify-center text-[7px]">{i+1}</span>
                                <span>{t}</span>
                              </div>
                              {i < selectedSkill.chainsOfThought.length - 1 && <span className="text-agent opacity-40">→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="pt-3 border-t border-zinc/10">
                          <span className="text-[7px] baunk-style opacity-30 block mb-1">Fundamental_Logic:</span>
                          <p className="text-[10px] font-mono italic opacity-60">"{selectedSkill.logic}"</p>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h4 className="baunk-style text-[9px] text-sovereign">Best_Practices_Guide</h4>
                      <div className="space-y-2">
                        {selectedSkill.bestPractices.map((b, i) => (
                          <div key={i} className="p-3 bg-white border border-sovereign/5 text-[10px] font-mono flex gap-3 shadow-sm">
                            <span className="text-agent">●</span>
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <footer className="pt-8 border-t border-zinc/10 flex flex-col gap-2 text-[6px] font-mono opacity-20 pb-4">
                      <span>SIGNATURE: {selectedSkill.signature}</span>
                      <span>PUBLIC_KEY: {selectedSkill.publicKey}</span>
                      <span>AUTHORIZED_EXECUTIVE_MANIFOLD_CALIBRATION_STABLE</span>
                    </footer>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
