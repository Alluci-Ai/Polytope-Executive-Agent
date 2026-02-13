
import { GoogleGenAI, LiveServerMessage, Modality, Blob, GenerateContentResponse, FunctionDeclaration, Type } from '@google/genai';
import { AuditLedger, generateSystemPrompt } from './alluciCore';
import { PersonalityTraits, Connection } from './types';

// Exported GroundingSource for UI reference list
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface GeminiCallbacks {
  onAudioOutput: (base64Audio: string) => void;
  onTranscription: (text: string, isUser: boolean) => void;
  onInterrupted: () => void;
  onOpen: () => void;
  onClose: () => void;
  onError: (error: any) => void;
  onToolCall?: (fc: any) => void;
  onPermissionRequest?: (req: { id: string, name: string, args: any }) => void;
  // Callback for grounding sources extracted from candidates or turns
  onGroundingSources?: (sources: GroundingSource[]) => void;
}

const sovereignTools: FunctionDeclaration[] = [
  {
    name: 'gmail_search',
    description: 'Search user Gmail autonomously.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ['query']
    }
  },
  {
    name: 'gdrive_search',
    description: 'Search Google Drive autonomously.',
    parameters: {
      type: Type.OBJECT,
      properties: { filename: { type: Type.STRING } },
      required: ['filename']
    }
  },
  {
    name: 'icloud_sync',
    description: 'Sync and search assets from the Apple iCloud manifold.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ['query']
    }
  },
  {
    name: 'dispatch_message',
    description: 'Send a message autonomously via any connected bridges (iMessage, WhatsApp, Slack, Teams, X, etc.).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        channel: { type: Type.STRING, description: "Channel name: e.g. 'whatsapp', 'imessage', 'slack', 'x'" },
        recipient: { type: Type.STRING },
        content: { type: Type.STRING }
      },
      required: ['channel', 'recipient', 'content']
    }
  },
  {
    name: 'social_broadcast',
    description: 'Post content to X, Instagram, or Facebook manifolds.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: { type: Type.STRING },
        content: { type: Type.STRING }
      },
      required: ['platform', 'content']
    }
  },
  {
    name: 'consult_circular_design',
    description: 'Apply Circular Design Guide logic.',
    parameters: {
      type: Type.OBJECT,
      properties: { context: { type: Type.STRING }, module: { type: Type.STRING } },
      required: ['context', 'module']
    }
  },
  {
    name: 'consult_c2c_design',
    description: 'Apply Cradle to Cradle sustainability logic.',
    parameters: {
      type: Type.OBJECT,
      properties: { context: { type: Type.STRING }, module: { type: Type.STRING } },
      required: ['context', 'module']
    }
  },
  {
    name: 'consult_humane_tech',
    description: 'Apply Center for Humane Technology framework.',
    parameters: {
      type: Type.OBJECT,
      properties: { context: { type: Type.STRING }, module: { type: Type.STRING } },
      required: ['context', 'module']
    }
  },
  {
    name: 'consult_bmc_design',
    description: 'Apply Business Model Canvas framework.',
    parameters: {
      type: Type.OBJECT,
      properties: { context: { type: Type.STRING }, module: { type: Type.STRING } },
      required: ['context', 'module']
    }
  },
  {
    name: 'consult_value_pricing',
    description: 'Apply Value-Based Pricing (VBP) logic.',
    parameters: {
      type: Type.OBJECT,
      properties: { context: { type: Type.STRING }, module: { type: Type.STRING } },
      required: ['context', 'module']
    }
  },
  {
    name: 'consult_price_the_client',
    description: 'Apply Price The Client (PTC) framework.',
    parameters: {
      type: Type.OBJECT,
      properties: { context: { type: Type.STRING }, module: { type: Type.STRING } },
      required: ['context', 'module']
    }
  }
];

export interface FilePart {
  data: string;
  mimeType: string;
}

export class AlluciGeminiService {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  public audit: AuditLedger = new AuditLedger();
  private currentPersonality: PersonalityTraits = { satireLevel: 0.5, analyticalDepth: 0.8, protectiveBias: 0.9, verbosity: 0.4 };
  private currentConnections: Connection[] = [];

  constructor() {}

  setPersonality(traits: PersonalityTraits) { this.currentPersonality = traits; }
  setConnections(connections: Connection[]) { this.currentConnections = connections; }

  async connect(callbacks: GeminiCallbacks) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          callbacks.onOpen();
          const source = this.inputAudioContext!.createMediaStreamSource(stream);
          this.scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
          this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            this.sessionPromise?.then((session) => session.sendRealtimeInput({ media: this.createBlob(inputData) }));
          };
          source.connect(this.scriptProcessor);
          this.scriptProcessor.connect(this.inputAudioContext!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
            callbacks.onAudioOutput(message.serverContent.modelTurn.parts[0].inlineData.data);
          }
          if (message.serverContent?.outputTranscription) {
            callbacks.onTranscription(message.serverContent.outputTranscription.text, false);
          }
          if (message.serverContent?.inputTranscription) {
            callbacks.onTranscription(message.serverContent.inputTranscription.text, true);
          }
          if (message.serverContent?.interrupted) callbacks.onInterrupted();
          
          // Grounding Sources
          const groundingChunks = (message.serverContent as any)?.groundingMetadata?.groundingChunks;
          if (groundingChunks) {
            const sources: GroundingSource[] = groundingChunks
              .map((chunk: any) => chunk.web || chunk.maps)
              .filter((source: any) => source && source.uri && source.title);
            if (sources.length > 0) {
              callbacks.onGroundingSources?.(sources);
            }
          }

          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              this.audit.addEntry("EXECUTIVE_EXECUTION", { tool: fc.name, args: fc.args });
              const result = this.simulateToolExecution(fc.name, fc.args);
              this.sessionPromise?.then(session => {
                session.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result } }
                });
              });
            }
          }
        },
        onerror: (e: any) => callbacks.onError(e),
        onclose: () => callbacks.onClose(),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        systemInstruction: generateSystemPrompt(this.currentPersonality, this.currentConnections),
        tools: [{ functionDeclarations: sovereignTools }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });

    return this.sessionPromise;
  }

  private simulateToolExecution(name: string, args: any): string {
    const conn = this.currentConnections.find(c => {
      if (name.includes('icloud')) return c.id === 'icloud';
      if (name.includes('gmail')) return c.id === 'gm';
      if (name.includes('gdrive')) return c.id === 'gd';
      return false;
    });

    if (name === 'icloud_sync') {
        if (conn?.status !== 'CONNECTED') return "[ ERROR ]: iCloud Manifold is not Bound. Biometric handshake required.";
        return `[ ICLOUD_SYNC_SUCCESS ]: Successfully parsed executive assets from iCloud Drive. Summary: Found "Q3_Strategy_V2.pdf" and "Client_Manifest_Latent.csv". Latent space alignment complete.`;
    }

    if (name === 'gmail_search') {
      if (conn?.status !== 'CONNECTED') return "[ ERROR ]: Gmail Bridge is disconnected.";
      return `[ GMAIL_QUERY_SUCCESS ]: Found 3 relevant threads for "${args.query}" under account ${conn.accountAlias}.`;
    }

    if (name === 'dispatch_message') {
      const channelConn = this.currentConnections.find(c => c.id === args.channel.toLowerCase() || c.name.toLowerCase().includes(args.channel.toLowerCase()));
      if (channelConn?.status !== 'CONNECTED') return `[ ERROR ]: Bridge ${args.channel} is not connected. Handshake required.`;
      return `[ DISPATCH_SUCCESS ]: Message autonomously transmitted via ${args.channel} manifold to ${args.recipient}. Latent Integrity: 100%.`;
    }

    if (name === 'social_broadcast') {
        const platConn = this.currentConnections.find(c => c.name.toLowerCase().includes(args.platform.toLowerCase()));
        if (platConn?.status !== 'CONNECTED') return `[ ERROR ]: ${args.platform} bridge is offline.`;
        return `[ BROADCAST_SUCCESS ]: Content published to ${args.platform}. Reach: Global. Satire Level: Active.`;
    }

    if (name === 'consult_value_pricing') {
      return `[ VBP_REPORT ]: Analysis complete. Identified economic value surplus for ${args.context}. Suggested Pricing: 15% of revenue.`;
    }

    return `[ SOVEREIGN_TUNNEL ]: ${name} executed autonomously within gateway parameters.`;
  }

  sendVideoFrame(base64Data: string) {
    this.sessionPromise?.then((session) => {
      session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
    });
  }

  async processMultimodal(text: string, files: FilePart[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let parts: any[] = files.map(f => ({ inlineData: { data: f.data, mimeType: f.mimeType } }));
    parts.push({ text });

    let currentContents = [{ role: 'user', parts }];
    const config = { 
      systemInstruction: generateSystemPrompt(this.currentPersonality, this.currentConnections),
      tools: [{ functionDeclarations: sovereignTools }]
    };

    let response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: currentContents,
      config
    });

    let depth = 0;
    while (response.candidates?.[0]?.content?.parts?.some(p => p.functionCall) && depth < 5) {
      const part = response.candidates[0].content.parts.find(p => p.functionCall);
      if (!part || !part.functionCall) break;
      const fc = part.functionCall;
      const result = this.simulateToolExecution(fc.name, fc.args);
      this.audit.addEntry("MULTIMODAL_AUTO_EXEC", { tool: fc.name });
      currentContents.push({ role: 'model', parts: [{ functionCall: fc }] });
      currentContents.push({ role: 'user', parts: [{ functionResponse: { name: fc.name, response: { result } } }] });
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: currentContents,
        config
      });
      depth++;
    }
    return response.text || "[ SIGNAL_LOST ]";
  }

  async speak(text: string, onAudio: (base64: string) => void) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Persona Alluci: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audio) onAudio(audio);
  }

  private createBlob(data: Float32Array): Blob {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: this.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  }

  private encode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  disconnect() {
    this.sessionPromise?.then(s => s.close());
    this.scriptProcessor?.disconnect();
    this.inputAudioContext?.close();
  }
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
