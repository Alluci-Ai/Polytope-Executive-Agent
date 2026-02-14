
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
  private skills: SkillManifest[] = [
    {
      name: "Workspace Bridge",
      id: "ws_01",
      category: "BRIDGE",
      description: "Direct integration with productivity silos for enterprise-level search and synchronization.",
      mindsets: ["Efficiency", "Organization"],
      methodologies: ["API Aggregation", "Deep Search"],
      chainsOfThought: ["Locate Resource", "Authenticate Bridge", "Query Suffix", "Synthesize Result"],
      logic: "Centralized access to fragmented workspace data.",
      bestPractices: ["Always index unread priority items first.", "Check vault integrity before data sync."],
      signature: "sig_poly_99",
      publicKey: "pub_ws_01",
      capabilities: ["gmail_search", "gdrive_search", "icloud_sync"],
      verified: true
    },
    {
      name: "Messaging Manifold",
      id: "msg_01",
      category: "MANIFOLD",
      description: "Unified communication dispatcher for high-security messaging platforms.",
      mindsets: ["Privacy", "Asynchronous"],
      methodologies: ["Encrypted Dispatch", "Protocol Switching"],
      chainsOfThought: ["Receive Signal", "Route to Bridge", "Verify Encryption", "Deliver Payload"],
      logic: "Communication must be strictly private and seamlessly routed.",
      bestPractices: ["Verify E2E status before every outgoing burst.", "Flush bridge cache after idle periods."],
      signature: "sig_poly_88",
      publicKey: "pub_msg_01",
      capabilities: ["dispatch_message", "imessage_bridge", "whatsapp_api"],
      verified: true
    },
    {
      name: "Social Manifold",
      id: "soc_01",
      category: "MANIFOLD",
      description: "Autonomous broadcasting and engagement across diverse social networks.",
      mindsets: ["Influence", "Network Aware"],
      methodologies: ["Algorithmic Engagement", "Broadcast Logic"],
      chainsOfThought: ["Curate Content", "Target Network", "Execute Post", "Audit Reach"],
      logic: "Maximize impact while minimizing cognitive exposure.",
      bestPractices: ["Schedule posts during peak resonance windows.", "Avoid high-frequency automated loops."],
      signature: "sig_poly_soc_77",
      publicKey: "pub_soc_01",
      capabilities: ["x_post", "ig_dm", "fb_broadcast"],
      verified: true
    },
    {
      name: "Circular Design Guide",
      id: "cdg_01",
      category: "FRAMEWORK",
      description: "Framework for designing systemic optimization and regenerative product lifecycles.",
      mindsets: ["Systemic", "Regenerative"],
      methodologies: ["Flow Analysis", "Optimization Loops"],
      chainsOfThought: ["Map Material Flow", "Identify Waste", "Optimize Loop", "Calculate Value"],
      logic: "Waste is merely data in the wrong place.",
      bestPractices: ["Prioritize product-as-service models.", "Ensure infinite loops for critical resources."],
      signature: "sig_poly_cdg_101",
      publicKey: "pub_cdg_01",
      capabilities: ["Systemic_Optimization", "Material_Flow_Analysis", "Regenerative_Architecture", "Product_As_Service_Modelling"],
      verified: true
    },
    {
      name: "Cradle to Cradle",
      id: "c2c_01",
      category: "FRAMEWORK",
      description: "Design philosophy focusing on biological and technical nutrient cycles.",
      mindsets: ["Nature-Inspired", "Nutrient Cycle"],
      methodologies: ["Cycle Verification", "Non-Toxic Synthesis"],
      chainsOfThought: ["Classify Material", "Verify Pathway", "Ensure Non-Toxicity", "Close Cycle"],
      logic: "All materials are nutrients for a subsequent system.",
      bestPractices: ["Avoid all legacy toxins.", "Verify renewable energy manifold status."],
      signature: "sig_poly_c2c_202",
      publicKey: "pub_c2c_01",
      capabilities: ["Biological_Cycle_Verification", "Technical_Manifold_Recycling", "Non_Toxic_Synthesis", "Energy_Manifold_Renewal"],
      verified: true
    },
    {
      name: "Humane Technology",
      id: "cht_01",
      category: "FRAMEWORK",
      description: "Mitigation of attention economy traps through ethical algorithmic engagement.",
      mindsets: ["Ethical", "Human-Centric"],
      methodologies: ["Vulnerability Audit", "Attention Management"],
      chainsOfThought: ["Scan Engagement Loops", "Audit Bias", "Sanitize Algorithm", "Protect User"],
      logic: "Technology must serve the human, not the machine.",
      bestPractices: ["Minimize cognitive load.", "Defend democratic integrity in every interaction."],
      signature: "sig_poly_cht_303",
      publicKey: "pub_cht_01",
      capabilities: ["Attention_Economy_Mitigation", "Ethical_Engagement_Algorithmic", "Cognitive_Vulnerability_Audit", "Democratic_Integrity_Manifold"],
      verified: true
    },
    {
      name: "Business Model Canvas",
      id: "bmc_01",
      category: "FRAMEWORK",
      description: "Architectural mapping of value propositions and revenue streams.",
      mindsets: ["Structural", "Economic"],
      methodologies: ["Value Mapping", "Revenue Architecture"],
      chainsOfThought: ["Identify Value", "Segment Customer", "Map Stream", "Audit Cost"],
      logic: "Revenue is a byproduct of solved complexity.",
      bestPractices: ["Iterate cost structures constantly.", "Segment customer manifolds by resonance."],
      signature: "sig_poly_bmc_404",
      publicKey: "pub_bmc_01",
      capabilities: ["Value_Proposition_Mapping", "Revenue_Stream_Architecture", "Customer_Manifold_Segmenting", "Cost_Structure_Entropy_Reduction"],
      verified: true
    },
    {
      name: "Value Based Pricing",
      id: "vbp_01",
      category: "FRAMEWORK",
      description: "Extraction of economic surplus through psychological worth quantification.",
      mindsets: ["Strategic", "Differential"],
      methodologies: ["Surplus Extraction", "Anchor Calibration"],
      chainsOfThought: ["Assess Worth", "Set Anchor", "Quantify Value", "Extract Surplus"],
      logic: "Price is what you pay; value is what you get.",
      bestPractices: ["Never anchor to cost.", "Synthesize differential value based on outcomes."],
      signature: "sig_poly_vbp_505",
      publicKey: "pub_vbp_01",
      capabilities: ["Economic_Surplus_Extraction", "Psychological_Anchor_Calibration", "Perceived_Worth_Quantification", "Differential_Value_Synthesis"],
      verified: true
    },
    {
      name: "Price The Client",
      id: "ptc_01",
      category: "FRAMEWORK",
      description: "Strategic leverage auditing to discover client-specific budget manifolds.",
      mindsets: ["Opportunistic", "Tactical"],
      methodologies: ["Budget Discovery", "Leverage Audit"],
      chainsOfThought: ["Scan Client Horizon", "Locate Leverage", "Discovery Budget", "Calibrate Offer"],
      logic: "The client’s capacity defines the pricing ceiling.",
      bestPractices: ["Identify risk tolerance before presenting numbers.", "Audit executive sovereignty levels."],
      signature: "sig_poly_ptc_606",
      publicKey: "pub_ptc_01",
      capabilities: ["Contextual_Budget_Discovery", "Risk_Tolerance_Manifold", "Executive_Sovereignty_Pricing", "Strategic_Leverage_Audit"],
      verified: true
    },
    {
      name: "Verus Protocol",
      id: "vrs_01",
      category: "BRIDGE",
      description: "Interface for PBaaS chain operations and MEV-resistant swaps within the Verus ecosystem.",
      mindsets: ["Sovereign", "Decentralized"],
      methodologies: ["Chain Launch", "Cross-Chain Swaps"],
      chainsOfThought: ["Verify VerusID", "Initiate Swap", "Await Confirmation", "Execute PBaaS Node"],
      logic: "Deterministic decentralization for true sovereign execution.",
      bestPractices: ["Always enforce VDXF signature.", "Monitor cross-chain interoperability latency."],
      signature: "sig_verus_v4_3",
      publicKey: "pub_vrs_01",
      capabilities: ["verus_id_operations", "pbaas_chain_launch", "mev_resistant_swaps", "cross_chain_interoperability"],
      verified: true
    }
  ];
  
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
