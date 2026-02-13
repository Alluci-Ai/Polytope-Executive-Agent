
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

export enum AutonomyLevel {
  RESTRICTED = "RESTRICTED",
  SEMI_AUTONOMOUS = "SEMI_AUTONOMOUS",
  SOVEREIGN = "SOVEREIGN"
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

export interface PersonalityTraits {
  satireLevel: number;
  analyticalDepth: number;
  protectiveBias: number;
  verbosity: number;
}

export type AuthType = 
  | 'OAUTH2' 
  | 'SECURE_TUNNEL' 
  | 'IDENTITY_LINK' 
  | 'QR_SYNC' 
  | 'TOKEN' 
  | 'WEB_SESSION' 
  | 'VDXF_HANDSHAKE';

export interface Connection {
  id: string;
  name: string;
  status: 'DISCONNECTED' | 'BINDING' | 'CONNECTED';
  type: 'MESSAGING' | 'WORKSPACE';
  authType: AuthType;
  autonomyLevel: AutonomyLevel;
  accountAlias?: string;
  profileImg?: string;
  lastSynced?: string;
  isEncrypted: boolean;
}

export interface ApiManifoldKeys {
  llm: Record<string, string>;
  audio: Record<string, string>;
  music: Record<string, string>;
  image: Record<string, string>;
  video: Record<string, string>;
}
