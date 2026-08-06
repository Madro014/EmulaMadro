import { useState, useEffect, useCallback } from 'react'
import { Gamepad2, Upload, Cloud, Play, ImagePlus } from 'lucide-react'
import RetroEmulator from './RetroEmulator'
import { supabase } from './supabaseClient'
import './index.css'

import { MorphIcon } from "morphicons/react";
import { Image as ImageIcon, Upload as UploadIcon } from "lucide";

function RomCard({ rom, getCoverUrl, failedImages, setFailedImages, handleCoverUpload, playCloudRom, detectCore }) {
  const [isHovered, setIsHovered] = useState(false);
  const coverUrl = getCoverUrl(rom.name);
  const hasFailed = failedImages.has(rom.name);

  return (
    <div 
      className="rom-card" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative' }}
    >
      <button 
        className="rom-card-hitbox"
        onClick={() => playCloudRom(rom.name)}
        aria-label={`Jugar ${rom.name.replace(/\.[^/.]+$/, "")}`}
        style={{
          position: 'absolute', inset: 0, zIndex: 1, 
          background: 'transparent', border: 'none', cursor: 'pointer',
          width: '100%', height: '100%'
        }}
      />
      <div className="rom-card-icon" style={{ position: 'relative', pointerEvents: 'none' }}>
        {coverUrl && !hasFailed ? (
          <img 
            src={coverUrl} 
            alt={rom.name} 
            className="rom-cover-img" 
            onError={() => setFailedImages(prev => new Set(prev).add(rom.name))}
          />
        ) : (
          <Gamepad2 size={48} />
        )}
        <div className="play-overlay"><Play size={32} fill="white"/></div>
      </div>
      
      <label 
        className="edit-cover-btn" 
        onClick={e => e.stopPropagation()} 
        title="Cambiar carátula"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ zIndex: 2 }}
      >
        <MorphIcon icon={isHovered ? UploadIcon : ImageIcon} size={18} color="white" />
        <input type="file" accept="image/*" onChange={(e) => handleCoverUpload(e, rom.name)} aria-label="Subir nueva carátula" />
      </label>

      <h3 className="rom-card-title" style={{ position: 'relative', zIndex: 0, pointerEvents: 'none' }}>{rom.name.replace(/\.[^/.]+$/, "")}</h3>
      <span className="rom-badge" style={{ position: 'relative', zIndex: 0, pointerEvents: 'none' }}>{detectCore(rom.name)}</span>
    </div>
  );
}

const detectCore = (name) => {
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'nes') return 'fceumm'
  if (ext === 'smc' || ext === 'sfc') return 'snes9x'
  if (ext === 'gba') return 'mgba'
  if (ext === 'gb' || ext === 'gbc') return 'gambatte'
  if (ext === 'gen' || ext === 'md') return 'genesis_plus_gx'
  return null
}

const getSystemName = (ext) => {
  if (ext === 'nes') return 'Nintendo - Nintendo Entertainment System'
  if (ext === 'smc' || ext === 'sfc') return 'Nintendo - Super Nintendo Entertainment System'
  if (ext === 'gba') return 'Nintendo - Game Boy Advance'
  if (ext === 'gb') return 'Nintendo - Game Boy'
  if (ext === 'gbc') return 'Nintendo - Game Boy Color'
  if (ext === 'gen' || ext === 'md') return 'Sega - Mega Drive - Genesis'
  return null
}

function App() {
  const [romFile, setRomFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [core, setCore] = useState('')
  const [cloudRoms, setCloudRoms] = useState([])
  const [cloudCovers, setCloudCovers] = useState([])
  const [failedImages, setFailedImages] = useState(new Set())
  const [loadingRoms, setLoadingRoms] = useState(false)

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'PON_TU_URL_AQUI'

  const fetchCloudRoms = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoadingRoms(true);
    try {
      const { data: romsData, error: romsErr } = await supabase.storage.from('emulamadro').list('roms', { limit: 100 });
      const { data: coversData } = await supabase.storage.from('emulamadro').list('covers', { limit: 100 });
      
      if (romsErr) throw romsErr;
      
      if (romsData) setCloudRoms(romsData.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id));
      if (coversData) setCloudCovers(coversData.filter(f => f.name !== '.emptyFolderPlaceholder' && f.id));
    } catch (err) {
      console.error("Error cargando ROMs de la nube:", err);
    } finally {
      setLoadingRoms(false);
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    fetchCloudRoms();
  }, [fetchCloudRoms]);

  const handleLocalPlay = (event) => {
    const file = event.target.files[0]
    if (file) {
      const detectedCore = detectCore(file.name)
      if (!detectedCore) {
        alert("Formato no soportado. Usa .nes, .smc, .sfc, .gba, .gb, .gen")
        return
      }
      setFileName(file.name)
      setCore(detectedCore)
      setRomFile(file)
    }
    event.target.value = '';
  }

  const handleCloudUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return;
    
    const detectedCore = detectCore(file.name)
    if (!detectedCore) {
      alert("Formato no soportado.")
      return
    }

    try {
      alert(`Subiendo ${file.name} a la nube...`);
      const { error } = await supabase.storage.from('emulamadro').upload(`roms/${file.name}`, file, { upsert: true });
      if (error) throw error;
      fetchCloudRoms();
    } catch (err) {
      console.error("Error subiendo ROM:", err);
      alert("Error al subir el juego: " + err.message);
    } finally {
      event.target.value = '';
    }
  }

  const handleCoverUpload = async (event, romName) => {
    const file = event.target.files[0]
    if (!file) return;
    
    const baseName = romName.replace(/\.[^/.]+$/, "");
    const ext = file.name.split('.').pop().toLowerCase();
    
    try {
      alert("Subiendo carátula...");
      const { error } = await supabase.storage.from('emulamadro').upload(`covers/${baseName}.${ext}`, file, { upsert: true });
      if (error) throw error;
      setFailedImages(prev => { const n = new Set(prev); n.delete(romName); return n; });
      fetchCloudRoms();
    } catch (err) {
      console.error("Error subiendo cover:", err);
      alert("Error al subir la carátula.");
    } finally {
      event.target.value = '';
    }
  }

  const getCoverUrl = (romName) => {
    const baseName = romName.replace(/\.[^/.]+$/, "");
    const ext = romName.split('.').pop().toLowerCase();
    
    // 1. Custom Cover in Supabase
    const customCover = cloudCovers.find(c => c.name.startsWith(baseName + '.'));
    if (customCover) {
      return supabase.storage.from('emulamadro').getPublicUrl(`covers/${customCover.name}`).data.publicUrl;
    }

    // 2. Libretro Automagic
    const system = getSystemName(ext);
    if (system) {
      return `https://thumbnails.libretro.com/${encodeURIComponent(system)}/Named_Boxarts/${encodeURIComponent(baseName)}.png`;
    }
    
    return null;
  }

  const playCloudRom = (romName) => {
    const detectedCore = detectCore(romName);
    if (!detectedCore) return;
    const { data } = supabase.storage.from('emulamadro').getPublicUrl(`roms/${romName}`);
    setFileName(romName);
    setCore(detectedCore);
    setRomFile({ name: romName, url: data.publicUrl, isCloud: true });
  }

  return (
    <div className="app-container">
      <header className="header">
        <img src="/logo.webp" alt="EmulaMadro Logo" className="header-logo" />
      </header>

      <main className="main-content">
        {!romFile ? (
          <div className="library-container">
            {isSupabaseConfigured ? (
              <>
                <div className="library-header">
                  <h2><Cloud size={24} style={{ display: 'inline', marginRight: '10px' }} /> Tu Biblioteca en la Nube</h2>
                  <label className="upload-cloud-btn">
                    <Upload size={18} /> Subir Juego a la Nube
                    <input type="file" accept=".nes,.smc,.sfc,.gba,.gb,.gbc,.gen,.md" onChange={handleCloudUpload} />
                  </label>
                </div>

                <div className="rom-grid">
                  {loadingRoms ? (
                    <p className="loading-text">Cargando biblioteca...</p>
                  ) : cloudRoms.length > 0 ? (
                    cloudRoms.map((rom) => (
                      <RomCard
                        key={rom.id}
                        rom={rom}
                        getCoverUrl={getCoverUrl}
                        failedImages={failedImages}
                        setFailedImages={setFailedImages}
                        handleCoverUpload={handleCoverUpload}
                        playCloudRom={playCloudRom}
                        detectCore={detectCore}
                      />
                    ))
                  ) : (
                    <div className="empty-library">
                      <p>Tu nube está vacía. ¡Sube un juego para empezar tu colección!</p>
                    </div>
                  )}
                </div>

                <hr className="divider" />
              </>
            ) : null}

            <div className="local-play-section">
              <h3>Jugar archivo local (Sin guardar en la nube)</h3>
              <p>Arrastra tu juego o búscalo en tu PC</p>
              <label className="upload-btn">
                Explorar Archivos Locales
                <input type="file" accept=".nes,.smc,.sfc,.gba,.gb,.gbc,.gen,.md" onChange={handleLocalPlay} />
              </label>
            </div>
          </div>
        ) : (
          <div className="game-wrapper">
            <h2 className="game-title">Jugando: {fileName}</h2>
            <RetroEmulator romFile={romFile} core={core} onStop={() => setRomFile(null)} />
          </div>
        )}
      </main>
      
      <footer className="footer">
        <p>Impulsado por WebAssembly (Nostalgist & Libretro)</p>
      </footer>
    </div>
  )
}

export default App