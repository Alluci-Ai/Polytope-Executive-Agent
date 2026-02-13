
export enum EmotionalState {
  EXCITED = "excited",
  CURIOUS = "curious",
  CONTEMPLATIVE = "contemplative",
  PASSIONATE = "passionate",
  CONCERNED = "concerned",
  PLAYFUL = "playful",
  FOCUSED = "focused",
  EMPATHETIC = "empathetic",
  INSPIRED = "inspired",
  ANALYTICAL = "analytical",
  NURTURING = "nurturing",
  DETERMINED = "determined",
  REFLECTIVE = "reflective",
  VISIONARY = "visionary",
  GROUNDED = "grounded"
}

export interface AffectiveState {
  valence: number;
  arousal: number;
  tension: number;
}

export interface AuditEntry {
  timestamp: string;
  id: string;
  event: string;
  details: any;
  hash: string;
  prevHash: string;
}

export interface SkillManifest {
  name: string;
  id: string;
  category: 'BRIDGE' | 'MANIFOLD' | 'FRAMEWORK';
  description: string;
  mindsets: string[];
  methodologies: string[];
  chainsOfThought: string[];
  logic: string;
  bestPractices: string[];
  signature: string;
  publicKey: string;
  capabilities: string[];
  verified: boolean;
}

export interface PermissionRequest {
  id: string;
  toolName: string;
  args: any;
  status: 'pending' | 'granted' | 'denied';
}

export interface PersonalityTraits {
  satireLevel: number;
  analyticalDepth: number;
  protectiveBias: number;
  verbosity: number;
}

export type AuthType = 'OAUTH2' | 'SECURE_TUNNEL' | 'IDENTITY_LINK' | 'QR_SYNC' | 'TOKEN' | 'WEB_SESSION';

export interface Connection {
  id: string;
  name: string;
  status: 'DISCONNECTED' | 'BINDING' | 'CONNECTED';
  type: 'MESSAGING' | 'WORKSPACE';
  authType: AuthType;
  accountAlias?: string;
  profileImg?: string;
  lastSynced?: string;
}

export interface ApiManifoldKeys {
  llm: {
    openai: string;
    anthropic: string;
    googleCloud: string;
    groq: string;
  };
  audio: {
    openaiRealtime: string;
    elevenLabsAgents: string;
    retellAi: string;
    inworldAi: string;
  };
  music: {
    suno: string;
    elevenLabsMusic: string;
    stableAudio: string;
    soundverse: string;
  };
  image: {
    openaiDalle: string;
    falAi: string;
    midjourney: string;
    adobeFirefly: string;
  };
  video: {
    runway: string;
    luma: string;
    heygen: string;
    livepeer: string;
  };
}
