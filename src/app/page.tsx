'use client';

import { useState, useRef } from 'react';
import { processAudio, downloadWav, ToolType } from '@/lib/audio';
import { Upload, Download, Play, Pause, Volume2, Mic, Waves, Sparkles, Sun, Moon, Menu, X } from 'lucide-react';

const tools = [
  { id: 'silence' as ToolType, icon: Volume2, label: 'Stille entfernen', desc: 'Pausen automatisch entfernen' },
  { id: 'noise' as ToolType, icon: Mic, label: 'Rauschen', desc: 'Hintergrundgeräusche reduzieren' },
  { id: 'loudness' as ToolType, icon: Waves, label: 'Lautstärke', desc: 'Auf Standard-Pegel bringen' },
  { id: 'quality' as ToolType, icon: Sparkles, label: 'Qualität', desc: 'Gesamtklang verbessern' },
];

export default function Home() {
  const [tool, setTool] = useState<ToolType>('silence');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [menuOpen, setMenuOpen] = useState(false);

  // Settings
  const [aggression, setAggression] = useState(80);
  const [noiseLevel, setNoiseLevel] = useState<'light' | 'medium' | 'strong'>('medium');
  const [targetLufs, setTargetLufs] = useState(-16);
  const [enhanceLevel, setEnhanceLevel] = useState<'light' | 'medium' | 'strong'>('medium');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setResult(null);

    await processAudio(
      file,
      { tool, aggression, noiseLevel, targetLufs, enhanceLevel },
      () => {},
      (blob) => { setResult(blob); setProcessing(false); },
      (err) => { alert(err.message); setProcessing(false); }
    );
  };

  const handleDownload = () => {
    if (!result) return;
    const base = file?.name?.replace(/\.[^/.]+$/, '') || 'audio';
    downloadWav(result, `${base}_${tool}.wav`);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: 'var(--text)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} style={{ color: 'var(--bg)' }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 18 }}>AudioAI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'none' }}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ paddingTop: 80, maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        {/* Hero */}
        <section className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
            Audio <span style={{ fontWeight: 300 }}>bearbeiten</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 400, margin: '0 auto' }}>
            Professionelle Werkzeuge für Audio-Files
          </p>
        </section>

        {/* Tools */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); setResult(null); }}
              className="card animate-fade-in"
              style={{ 
                textAlign: 'center', 
                cursor: 'pointer',
                borderColor: tool === t.id ? 'var(--text)' : 'var(--border)',
                background: tool === t.id ? 'var(--surface-elevated)' : 'var(--surface)'
              }}
            >
              <t.icon size={24} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 500, fontSize: 14 }}>{t.label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.desc}</div>
            </button>
          ))}
        </section>

        {/* Upload */}
        <section className="animate-fade-in" style={{ marginBottom: 24 }}>
          <label className="card" style={{ display: 'block', textAlign: 'center', cursor: 'pointer', padding: 32 }}>
            <Upload size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontWeight: 500 }}>{file ? file.name : 'Datei auswählen'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>MP3, WAV, M4A bis 50MB</div>
            <input type="file" accept="audio/*" onChange={handleFile} />
          </label>
        </section>

        {/* Settings */}
        {file && (
          <section className="animate-fade-in" style={{ marginBottom: 24 }}>
            <div className="card">
              {tool === 'silence' && (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>Aggressivität: {aggression}%</div>
                  <input type="range" min="70" max="95" value={aggression} onChange={(e) => setAggression(+e.target.value)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                    <span>Sanft</span><span>Aggressiv</span>
                  </div>
                </>
              )}
              {tool === 'noise' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['light', 'medium', 'strong'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setNoiseLevel(l)}
                      className="btn"
                      style={{ flex: 1, background: noiseLevel === l ? 'var(--text)' : 'var(--surface-elevated)', color: noiseLevel === l ? 'var(--bg)' : 'var(--text)', textTransform: 'capitalize' }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
              {tool === 'loudness' && (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>Ziel-LUFS: {targetLufs}</div>
                  <input type="range" min="-24" max="-10" value={targetLufs} onChange={(e) => setTargetLufs(+e.target.value)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                    <span>-24 (Podcast)</span><span>-10 (Laut)</span>
                  </div>
                </>
              )}
              {tool === 'quality' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['light', 'medium', 'strong'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setEnhanceLevel(l)}
                      className="btn"
                      style={{ flex: 1, background: enhanceLevel === l ? 'var(--text)' : 'var(--surface-elevated)', color: enhanceLevel === l ? 'var(--bg)' : 'var(--text)', textTransform: 'capitalize' }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Process */}
        {file && (
          <section className="animate-fade-in">
            <button
              className="btn"
              onClick={handleProcess}
              disabled={processing}
              style={{ width: '100%', padding: '16px', fontSize: 16 }}
            >
              {processing ? 'Verarbeite...' : 'Verarbeiten'}
            </button>
          </section>
        )}

        {/* Download */}
        {result && (
          <section className="animate-fade-in" style={{ marginTop: 16 }}>
            <button
              className="btn"
              onClick={handleDownload}
              style={{ width: '100%', padding: '16px', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Download size={20} /> Herunterladen
            </button>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12, borderTop: '1px solid var(--border)', marginTop: 48 }}>
        © 2026 AudioAI
      </footer>
    </div>
  );
}
