
import React, { useState, useEffect, useCallback } from 'react';
import { PolytopeIdentity } from './App'; // Assuming exported or duplicated
import PersonalityField from './PersonalityField';
import { SoulPreferences, SoulHumor, SoulConciseness } from './types';

// Local Echo Heuristic (Client-side fast preview)
const generateGhostEcho = (prefs: SoulPreferences): string => {
  let base = "I have analyzed the current data stream";
  
  if (prefs.tone > 0.8) base = "The data stream has been thoroughly analyzed";
  else if (prefs.tone < 0.3) base = "Just checked the data stream";

  if (prefs.conciseness === SoulConciseness.CONCISE) base = "Data stream analyzed";
  else if (prefs.conciseness === SoulConciseness.EXPRESSIVE) base += ", revealing several intricate patterns worth noting";

  if (prefs.humor === SoulHumor.WITTY) base += ". Fascinating stuff, really.";
  else if (prefs.humor === SoulHumor.PLAYFUL) base += "! 🚀";
  else if (prefs.humor === SoulHumor.DRY) base += ". It is as exhilarating as you might expect.";

  if (prefs.assertiveness > 0.8) base += " Proceeding with execution.";
  else if (prefs.assertiveness < 0.4) base += " How should we proceed?";

  return base;
};

const DAEMON_URL = 'http://localhost:8000';

const SoulPreferencesPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [prefs, setPrefs] = useState<SoulPreferences>({
    tone: 0.5,
    humor: SoulHumor.DRY,
    empathy: 0.5,
    assertiveness: 0.5,
    creativity: 0.5,
    verbosity: 0.5,
    conciseness: SoulConciseness.BALANCED
  });
  
  const [echo, setEcho] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load initial
  useEffect(() => {
    const fetchPrefs = async () => {
      const token = localStorage.getItem('alluci_daemon_token');
      try {
        const res = await fetch(`${DAEMON_URL}/soul/preferences`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setPrefs(data);
        }
      } catch (e) { 
        // Suppress error if daemon is offline
        // console.error("Failed to load soul prefs", e); 
      }
    };
    fetchPrefs();
  }, []);

  // Update Echo on change
  useEffect(() => {
    setEcho(generateGhostEcho(prefs));
  }, [prefs]);

  // Sync to Backend (Debounced manually via UI action or blur in a real app, here via button for safety)
  const handleSave = async () => {
    setIsSyncing(true);
    const token = localStorage.getItem('alluci_daemon_token');
    try {
      await fetch(`${DAEMON_URL}/soul/preferences`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(prefs)
      });
      setIsDirty(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const updatePref = (key: keyof SoulPreferences, value: any) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  return (
    <div className="flex flex-col gap-8 md:gap-12 py-4 md:py-8 h-full">
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Visual Anchor */}
          <div className="lg:col-span-4 flex flex-col items-center justify-start space-y-8 py-10 bg-zinc/5 border border-sovereign/5 relative overflow-hidden">
             <div className="relative z-10 flex flex-col items-center">
                {/* Reusing Polytope Identity SVG inline or imported if possible. Using placeholder class here */}
                <div className={`transition-all duration-700 ${isDirty ? 'scale-110 drop-shadow-[0_0_15px_rgba(145,214,95,0.6)]' : ''}`}>
                   <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
                      <path d="M11 26L89 8L45 42L11 26Z" fill="#91D65F" fillOpacity="1" />
                      <path d="M89 8L74 92L45 42L89 8Z" fill="#91D65F" fillOpacity="0.8" />
                      <path d="M74 92L11 26L45 42L74 92Z" fill="#91D65F" fillOpacity="0.6" />
                   </svg>
                </div>
                <div className="text-center mt-8">
                   <span className="baunk-style text-[10px] tracking-[0.5em] block opacity-40">Soul_Layer_v2.0</span>
                   <h3 className="baunk-style text-xl mt-2">Calibration_Matrix</h3>
                </div>
             </div>
             
             {/* Ghost Echo Box */}
             <div className="w-[85%] mt-12 p-6 border-l-2 border-agent bg-black/5 relative">
                <span className="absolute -top-3 left-0 bg-white px-2 text-[8px] baunk-style text-agent">GHOST_ECHO_PREVIEW</span>
                <p className="font-mono text-[10px] md:text-[11px] leading-relaxed opacity-80 italic">
                  "{echo}"
                </p>
             </div>

             {isDirty && (
               <button 
                 onClick={handleSave}
                 disabled={isSyncing}
                 className="mt-auto mb-8 alce-button baunk-style text-[10px] px-8 bg-agent text-white w-[80%]"
               >
                 {isSyncing ? '[ SYNCING_VAULT... ]' : '[ COMMIT_CHANGES ]'}
               </button>
             )}
          </div>

          {/* Matrix Controls */}
          <div className="lg:col-span-8 flex flex-col gap-6 px-4 overflow-y-auto scrollbar-hide pb-20">
             <h3 className="baunk-style text-[12px] border-b border-sovereign pb-1 opacity-50 tracking-[0.3em]">Parameter_Tuning</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PersonalityField 
                  label="TONE_FORMALITY" 
                  type="slider" 
                  value={prefs.tone} 
                  onChange={(v) => updatePref('tone', v)}
                  description="0: Casual/Slang ↔ 1: Academic/Strict"
                />
                <PersonalityField 
                  label="ASSERTIVENESS" 
                  type="slider" 
                  value={prefs.assertiveness} 
                  onChange={(v) => updatePref('assertiveness', v)}
                  description="0: Collaborative/Passive ↔ 1: Directive/Commanding"
                />
                <PersonalityField 
                  label="EMPATHY_INDEX" 
                  type="slider" 
                  value={prefs.empathy} 
                  onChange={(v) => updatePref('empathy', v)}
                  description="Weighting of emotional validation logic."
                />
                <PersonalityField 
                  label="CREATIVITY_TEMP" 
                  type="slider" 
                  value={prefs.creativity} 
                  onChange={(v) => updatePref('creativity', v)}
                  description="Divergent thinking probability."
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <PersonalityField 
                  label="HUMOR_MODE" 
                  type="toggle" 
                  value={prefs.humor}
                  options={[SoulHumor.DRY, SoulHumor.WITTY, SoulHumor.PLAYFUL]}
                  onChange={(v) => updatePref('humor', v)}
                  description="Selects the comedic sub-routine."
                />
                <PersonalityField 
                  label="CONCISENESS" 
                  type="toggle" 
                  value={prefs.conciseness}
                  options={[SoulConciseness.CONCISE, SoulConciseness.BALANCED, SoulConciseness.EXPRESSIVE]}
                  onChange={(v) => updatePref('conciseness', v)}
                  description="Output token density control."
                />
             </div>

             <div className="p-6 bg-zinc/5 border border-zinc/20 text-[9px] font-mono leading-relaxed mt-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${isDirty ? 'bg-tension animate-pulse' : 'bg-agent'}`} />
                <span className="opacity-60">
                  {isDirty 
                    ? "VAULT_STATE_MISMATCH: Local changes pending commit." 
                    : "VAULT_STATE_SYNCED: Sovereign identity secure."}
                </span>
             </div>
          </div>
       </div>
    </div>
  );
};

export default SoulPreferencesPanel;
