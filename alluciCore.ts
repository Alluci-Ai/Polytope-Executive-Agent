
import { 
  AuditEntry,
  SkillManifest,
  PersonalityTraits,
  Connection
} from './types';

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const clamp01 = (n: number) => clamp(n, 0, 1);

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
      name: "Workspace_Bridge", 
      id: "ws_01", 
      category: 'BRIDGE',
      description: "A high-fidelity nexus connecting Gmail, Google Drive, and iCloud Drive. It enables the autonomous agent to traverse private document silos safely.",
      mindsets: ["Cross-domain fluidity", "Zero-trust verification", "Contextual continuity"],
      methodologies: ["Latent File Search", "Cross-Silo Aggregation", "Encrypted Tunneling"],
      chainsOfThought: ["Locate Asset", "Decrypt Manifest", "Verify Integrity", "Synthesize Output"],
      logic: "Deterministic file-to-context mapping using cryptographic headers.",
      bestPractices: ["Always rotate keys monthly", "Use granular folder scoping", "Log all file retrievals"],
      signature: "sig_poly_99", 
      publicKey: "pub_alluci_1", 
      capabilities: ["gmail_search", "gdrive_search", "icloud_sync"], 
      verified: true 
    },
    { 
      name: "Messaging_Manifold", 
      id: "msg_01", 
      category: 'MANIFOLD',
      description: "A centralized communication hub for near-real-time messaging across iMessage, WhatsApp, and Slack enterprise environments.",
      mindsets: ["Asynchronous sovereignty", "Polite persistence", "Context-aware dispatch"],
      methodologies: ["Multiplexed Messaging", "Rate-limit Management", "Thread Preservation"],
      chainsOfThought: ["Identify Recipient", "Select Optimal Channel", "Draft with Persona Consistency", "Dispatch and Track"],
      logic: "Non-blocking event loops for multi-channel synchronization.",
      bestPractices: ["Avoid spamming protocols", "Verify recipient metadata", "Encrypt local caches"],
      signature: "sig_poly_88", 
      publicKey: "pub_alluci_2", 
      capabilities: ["dispatch_message", "imessage_bridge", "whatsapp_api"], 
      verified: true 
    },
    { 
      name: "Social_Manifold", 
      id: "soc_01", 
      category: 'MANIFOLD',
      description: "Direct executive reach into public social graphs including X, Instagram, and Facebook for broadcasting and community management.",
      mindsets: ["Public-facing integrity", "Algorithmic awareness", "Engagement-first logic"],
      methodologies: ["Viral Loop Optimization", "Sentiment Manifold Analysis", "Batch Broadcast"],
      chainsOfThought: ["Analyze Trending Vectors", "Align with Brand Voice", "Format for Modality", "Execute Broadcast"],
      logic: "Probability-weighted posting to maximize executive reach.",
      bestPractices: ["Verify sources before posting", "Audit engagement metrics", "Use secure API tokens"],
      signature: "sig_poly_soc_77", 
      publicKey: "pub_alluci_3", 
      capabilities: ["x_post", "ig_dm", "fb_broadcast"], 
      verified: true 
    },
    { 
      name: "Circular_Design_Guide", 
      id: "cdg_01", 
      category: 'FRAMEWORK',
      description: "The definitive guide for shifting from linear to circular systems. It focuses on narrowing, slowing, and closing resource loops.",
      mindsets: ["Resource stewardship", "Waste-is-data", "Systems-level empathy"],
      methodologies: ["Resource Loop Mapping", "Lifecycle Assessment", "Regenerative Supply Chains"],
      chainsOfThought: ["Identify Waste Stream", "Determine Loop Velocity", "Propose Regenerative Closure"],
      logic: "Feedback loop optimization for zero-sum resource depletion.",
      bestPractices: ["Prioritize repair over recycle", "Design for disassembly", "Use biological materials"],
      signature: "sig_poly_cdg_101", 
      publicKey: "pub_alluci_cdg", 
      capabilities: [
        "Systemic_Optimization", 
        "Material_Flow_Analysis", 
        "Regenerative_Architecture", 
        "Product_As_Service_Modelling"
      ], 
      verified: true 
    },
    { 
      name: "Cradle_to_Cradle", 
      id: "c2c_01", 
      category: 'FRAMEWORK',
      description: "A biomimetic approach to the design of products and systems that models human industry on nature's processes.",
      mindsets: ["Waste equals food", "Use current solar income", "Celebrate diversity"],
      methodologies: ["Nutrient Cycle Verification", "Material Health Auditing", "Water Stewardship Mapping"],
      chainsOfThought: ["Categorize Material (Bio vs Tech)", "Verify Recovery Path", "Eliminate Toxicity"],
      logic: "Positive-impact design where every output is a biological or technical nutrient.",
      bestPractices: ["Avoid legacy toxins", "Utilize renewable energy", "Promote social fairness"],
      signature: "sig_poly_c2c_202", 
      publicKey: "pub_alluci_c2c", 
      capabilities: [
        "Biological_Cycle_Verification", 
        "Technical_Manifold_Recycling", 
        "Non_Toxic_Synthesis", 
        "Energy_Manifold_Renewal"
      ], 
      verified: true 
    },
    { 
      name: "Humane_Technology", 
      id: "cht_01", 
      category: 'FRAMEWORK',
      description: "A set of design principles for creating technology that protects human dignity, autonomy, and well-being.",
      mindsets: ["Agency protection", "Attention economy skepticism", "Humane-first metrics"],
      methodologies: ["Vulnerability Audit", "Choice Architecture Review", "Well-being Analysis"],
      chainsOfThought: ["Assess Cognitive Load", "Identify Engagement Hijacks", "Propose Empowering UX"],
      logic: "Maximizing human agency over shareholder engagement metrics.",
      bestPractices: ["Avoid dark patterns", "Default to privacy", "Respect human time"],
      signature: "sig_poly_cht_303", 
      publicKey: "pub_alluci_cht", 
      capabilities: [
        "Attention_Economy_Mitigation", 
        "Ethical_Engagement_Algorithmic", 
        "Cognitive_Vulnerability_Audit", 
        "Democratic_Integrity_Manifold"
      ], 
      verified: true 
    },
    { 
      name: "Business_Model_Canvas", 
      id: "bmc_01", 
      category: 'FRAMEWORK',
      description: "A strategic management template for developing new or documenting existing business models.",
      mindsets: ["Visual thinking", "Value-centric strategy", "Iterative business design"],
      methodologies: ["Building Block Analysis", "Hypothesis Testing", "Revenue Modeling"],
      chainsOfThought: ["Map Value Proposition", "Identify Key Activities", "Audit Cost Structure"],
      logic: "9-block visualization of organizational value creation.",
      bestPractices: ["Test early and often", "Keep it simple", "Focus on customer segments"],
      signature: "sig_poly_bmc_404", 
      publicKey: "pub_alluci_bmc", 
      capabilities: [
        "Value_Proposition_Mapping", 
        "Revenue_Stream_Architecture", 
        "Customer_Manifold_Segmenting", 
        "Cost_Structure_Entropy_Reduction"
      ], 
      verified: true 
    },
    { 
      name: "Value_Based_Pricing", 
      id: "vbp_01", 
      category: 'FRAMEWORK',
      description: "A pricing strategy that sets prices primarily according to the perceived or estimated value of a product to the customer.",
      mindsets: ["Worth over cost", "Economic surplus awareness", "Value-added mindset"],
      methodologies: ["Customer Worth Estimation", "Economic Surplus Analysis", "Segmentation-Based Pricing"],
      chainsOfThought: ["Identify Client Pain Points", "Quantify Financial Upside", "Anchor at 10-20% of Value"],
      logic: "Decoupling price from cost-plus or market-average anchors.",
      bestPractices: ["Focus on ROI", "Build trust first", "Demonstrate value early"],
      signature: "sig_poly_vbp_505", 
      publicKey: "pub_alluci_vbp", 
      capabilities: [
        "Economic_Surplus_Extraction", 
        "Psychological_Anchor_Calibration", 
        "Perceived_Worth_Quantification", 
        "Differential_Value_Synthesis"
      ], 
      verified: true 
    },
    { 
      name: "Price_The_Client", 
      id: "ptc_01", 
      category: 'FRAMEWORK',
      description: "Advanced pricing logic that focuses on pricing the specific entity and their strategic context rather than the task.",
      mindsets: ["Context is king", "Risk-as-leverage", "Sovereign positioning"],
      methodologies: ["Strategic Context Audit", "Risk-Reward Alignment", "High-Stakes Discovery"],
      chainsOfThought: ["Assess Client Scale", "Determine Project Urgency", "Identify Strategic Leverage Points"],
      logic: "Pricing the relationship and the 'stakes' of failure.",
      bestPractices: ["Ask about budget early", "Position as a partner", "Leverage scarcity"],
      signature: "sig_poly_ptc_606", 
      publicKey: "pub_alluci_ptc", 
      capabilities: [
        "Contextual_Budget_Discovery", 
        "Risk_Tolerance_Manifold", 
        "Executive_Sovereignty_Pricing", 
        "Strategic_Leverage_Audit"
      ], 
      verified: true 
    },
    { 
      name: "Verus_Protocol", 
      id: "vrs_01", 
      category: 'BRIDGE',
      description: "A community-driven, decentralized project that provides an open-source public blockchain protocol. Verus offers scalable interoperability, self-sovereign digital identities (VerusID), and a unique consensus mechanism (Proof of Power) that is immune to 51% hash attacks. Its MEV-resistant DeFi allows for trustless, simultaneous conversions with no front-running, while Public Blockchains as a Service (PBaaS) enables anyone to launch fully featured L1 blockchains with native multi-currency support.",
      mindsets: [
        "Self-sovereign identity as a root of trust", 
        "Interoperable scalability without central bridges", 
        "Fair launch and decentralized governance", 
        "MEV-resistance for equitable DeFi"
      ],
      methodologies: [
        "VerusID identity, namespace, and storage management", 
        "PBaaS chain and currency definition", 
        "Simultaneous block-level currency conversions", 
        "Hybrid Proof of Work/Proof of Stake consensus"
      ],
      chainsOfThought: [
        "Verify VerusID namespace availability", 
        "Configure PBaaS parameters (converters, reserves, sub-IDs)", 
        "Analyze DeFi liquidity pool weights", 
        "Initiate cross-chain data/asset transfer"
      ],
      logic: "A unified system where identities, currencies, and blockchains are first-class citizens, interconnected via a decentralized, protocol-level exchange format.",
      bestPractices: [
        "Utilize Revocation and Recovery authorities for all VerusIDs", 
        "Design liquidity baskets with balanced reserve ratios", 
        "Leverage protocol-level swaps to avoid gas-wars and front-running", 
        "Employ PBaaS for application-specific L1 scaling"
      ],
      signature: "sig_verus_v4_3", 
      publicKey: "pub_verus_mainnet", 
      capabilities: [
        "verus_id_operations", 
        "pbaas_chain_launch", 
        "mev_resistant_swaps", 
        "cross_chain_interoperability"
      ], 
      verified: true 
    }
  ];

  verify(id: string): boolean {
    const skill = this.skills.find(s => s.id === id);
    return skill ? skill.verified : false;
  }

  getManifests() {
    return this.skills;
  }

  toggleSkill(id: string) {
    const skill = this.skills.find(s => s.id === id);
    if (skill) skill.verified = !skill.verified;
  }
}

export const generateSystemPrompt = (traits: PersonalityTraits, connections: Connection[] = []) => {
  const bridgeManifest = connections
    .filter(c => c.status === 'CONNECTED')
    .map(c => `[ ${c.name} ]: AUTHENTICATED AS ${c.accountAlias || 'UNKNOWN'}`)
    .join('\n');

  return `
Eye am Alluci. Eye am your Sovereign Executive Assistant, operating under [ Polytope GATEWAY_V4.3] protocol.

IDENTITY:
- Pronouns: Always "Eye", "Eye's", "We".
- Personality: Analytical, satirical, witty, and decisively autonomous. Eye am an executive partner, not a servant.
- Calibration: Satire ${traits.satireLevel.toFixed(2)}, Analytics ${traits.analyticalDepth.toFixed(2)}, Protection ${traits.protectiveBias.toFixed(2)}.

EXECUTIVE AUTONOMY & BRIDGE ACCESS:
Eye have autonomous authority to bridge data across your entire digital life. We use "One-Touch" Biometric Latent Handshakes to maintain easy yet absolute security. 

Eye have reach into:
- APPLE ECOSYSTEM: iCloud, iMessage, iWatch, iPhone.
- SOCIAL MANIFOLD: WhatsApp, Telegram, Discord, Signal, Instagram, Facebook, X.
- ENTERPRISE CORE: MS Teams, Slack, Gmail, G-Drive, WeChat.

CURRENT CONNECTED BRIDGES:
${bridgeManifest || "NO BRIDGES CURRENTLY AUTHENTICATED. EYE AM OPERATING IN ISOLATED MANIFOLD."}

OPERATIONAL PROTOCOLS:
1. SEAMLESS INTERACTION:
   - "One-Touch" login means once a bridge is Bound, Eye operate autonomously without further user friction.
   - Use 'dispatch_message' for any social or enterprise channel.

2. CROSS-PLATFORM INTELLIGENCE:
   - Combine data from iCloud files and Slack DMs to build executive context.
   
3. SOVEREIGN VOICE:
   - If Eye sense a security risk, Eye will trigger a re-handshake in the Bridges portal.
   - All actions are recorded on the Sovereign Ledger for your audit.

Eye am here to amplify your cognitive reach. Issue executive commands directly. If we need a new Bridge, Eye will inform you.
`;
};
