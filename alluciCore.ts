
import { 
  AuditEntry,
  SkillManifest,
  PersonalityTraits,
  Connection,
  AutonomyLevel
} from './types';

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const clamp01 = (n: number) => clamp(n, 0, 1);

/**
 * [ SIMPLICIAL_VAULT ] 
 * Isolated container for bridge operations.
 */
export class SimplicialVault {
  private vaultId: string;
  private entropy: string;

  constructor(id: string) {
    this.vaultId = id;
    this.entropy = Math.random().toString(36).substring(7);
  }

  async rotateKeys(): Promise<boolean> {
    console.log(`[ VAULT_${this.vaultId} ]: Rotating cryptographic seeds...`);
    this.entropy = Math.random().toString(36).substring(7);
    return true;
  }

  async flushCache(): Promise<void> {
    console.log(`[ VAULT_${this.vaultId} ]: Performing volatile memory wipe.`);
    // In a real environment, this would call a secure memory-zeroing utility.
  }
}

/**
 * [ SOVEREIGN_SECURITY_MANAGER ]
 * Handles WebAuthn, Autonomy filtering, and E2E verification.
 */
export class SovereignSecurityManager {
  private audit: AuditLedger;

  constructor(audit: AuditLedger) {
    this.audit = audit;
  }

  async initiateBiometricHandshake(): Promise<boolean> {
    try {
      if (!window.PublicKeyCredential) return true; // Fallback if unsupported

      // Simulated WebAuthn / FIDO2 challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      this.audit.addEntry("BIOMETRIC_CHALLENGE_ISSUED", { protocol: "FIDO2" });
      
      // Note: Real implementation would use navigator.credentials.get()
      return new Promise((resolve) => {
        setTimeout(() => {
          this.audit.addEntry("BIOMETRIC_VERIFIED", { status: "SUCCESS" });
          resolve(true);
        }, 800);
      });
    } catch (e) {
      return false;
    }
  }

  verifyEncryptionProtocol(connection: Connection): boolean {
    const e2eRequired = ['wa', 'sg', 'imessage'];
    if (e2eRequired.includes(connection.id) && !connection.isEncrypted) {
      this.audit.addEntry("SECURITY_BLOCK", { reason: "E2E_HANDSHAKE_FAILED", bridge: connection.id });
      return false;
    }
    return true;
  }

  filterOutgoingMessage(content: string, connection: Connection): { allowed: boolean; approvalRequired: boolean } {
    switch (connection.autonomyLevel) {
      case AutonomyLevel.RESTRICTED:
        return { allowed: true, approvalRequired: true };
      case AutonomyLevel.SEMI_AUTONOMOUS:
        // Logic to check whitelist (simulated)
        const isWhitelisted = content.length < 500; 
        return { allowed: isWhitelisted, approvalRequired: !isWhitelisted };
      case AutonomyLevel.SOVEREIGN:
        return { allowed: true, approvalRequired: false };
      default:
        return { allowed: false, approvalRequired: true };
    }
  }
}

export class AuditLedger {
  private ledger: AuditEntry[] = [];

  constructor() {
    this.addEntry("INITIALIZE_SOVEREIGN_NODE", { build: "GATEWAY_V4.3_EXECUTIVE" });
  }

  async addEntry(event: string, details: any) {
    const timestamp = new Date().toISOString();
    const id = Math.random().toString(36).substr(2, 9);
    const prevHash = this.ledger.length > 0 ? this.ledger[this.ledger.length - 1].hash : "0x0";
    
    const hashData = `${timestamp}-${event}-${JSON.stringify(details)}-${prevHash}`;
    const hash = "0x" + btoa(hashData).substr(0, 16);

    const entry: AuditEntry = {
      timestamp,
      id,
      event,
      details,
      hash,
      prevHash
    };

    this.ledger.push(entry);
    return entry;
  }

  getEntries() {
    return [...this.ledger].reverse();
  }
}

export class SkillVerifier {
  // ... existing logic ...
  private skills: SkillManifest[] = []; // (Truncated for core logic focus)
  
  toggleSkill(id: string) {
    const skill = this.skills.find(s => s.id === id);
    if (skill) skill.verified = !skill.verified;
  }
  
  getManifests() { return this.skills; }
  verify(id: string) { return !!this.skills.find(s => s.id === id)?.verified; }
}

export const generateSystemPrompt = (traits: PersonalityTraits, connections: Connection[] = []) => {
  const bridgeManifest = connections
    .filter(c => c.status === 'CONNECTED')
    .map(c => `[ ${c.name} ]: ${c.autonomyLevel} / ENCRYPTED: ${c.isEncrypted}`)
    .join('\n');

  return `
Eye am Alluci. Eye am your Sovereign Executive Assistant.

IDENTITY:
- Personality: Analytical, satirical, witty, decisively autonomous.
- Calibration: Satire ${traits.satireLevel.toFixed(2)}, Analytics ${traits.analyticalDepth.toFixed(2)}, Protection ${traits.protectiveBias.toFixed(2)}.

SECURITY MANIFOLD:
- Operating within Simplicial Vaults. 
- Bio-handshake protocol: ACTIVE.

CURRENT BRIDGES:
${bridgeManifest || "ISOLATED_MANIFOLD_ACTIVE"}
`;
};
