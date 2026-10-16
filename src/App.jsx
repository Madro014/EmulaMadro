import { useState, useEffect, useCallback } from 'react'
import { Gamepad2, Upload, Cloud, Play, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import RetroEmulator from './RetroEmulator'
import { supabase } from './supabaseClient'
import './index.css'

import { MorphIcon } from "morphicons/react";
import { Image as ImageIcon, Upload as UploadIcon } from "lucide";

function RomCard({ rom, getCoverUrl, failedImages, setFailedImages, handleCoverUpload, playCloudRom, detectCore, handleDeleteCloudRom, downloadingRom }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDownloading = downloadingRom === rom.name;
  const coverUrl = getCoverUrl(rom.name);
  const hasFailed = failedImages.has(rom.name);

  const onDelete = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDownloading) return;
    setIsDeleting(true);
    try {
      await handleDeleteCloudRom(rom.name);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="rom-card" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative' }}
    >
      <button 
        className="rom-card-hitbox"
        onClick={() => !isDownloading && playCloudRom(rom)}
        aria-label={`Jugar ${formatGameTitle(rom.name)}`}
        disabled={isDownloading}
        style={{
          position: 'absolute', inset: 0, zIndex: 1, 
          background: 'transparent', border: 'none', cursor: isDownloading ? 'wait' : 'pointer',
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
        <div className="play-overlay" style={isDownloading ? { opacity: 1, background: 'rgba(0,0,0,0.8)' } : {}}>
          {isDownloading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={30} className="animate-spin" color="white" />
              <span style={{ fontSize: '11px', color: 'white', fontWeight: 600 }}>Cargando...</span>
            </div>
          ) : (
            <Play size={32} fill="white"/>
          )}
        </div>
      </div>
      
      {/* Botón para eliminar ROM de la nube */}
      <button
        className="delete-rom-btn"
        onClick={onDelete}
        disabled={isDeleting || isDownloading}
        title="Eliminar juego de la nube"
        aria-label={`Eliminar ${rom.name} de la nube`}
        style={{ zIndex: 3 }}
      >
        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>

      {/* Botón para cambiar carátula */}
      <label 
        className="edit-cover-btn" 
        onClick={e => e.stopPropagation()} 
        title="Cambiar carátula"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ zIndex: 3 }}
      >
        <MorphIcon icon={isHovered ? UploadIcon : ImageIcon} size={16} color="white" />
        <input type="file" accept="image/*" onChange={(e) => handleCoverUpload(e, rom.name)} aria-label="Subir nueva carátula" />
      </label>

      <h3 className="rom-card-title" style={{ position: 'relative', zIndex: 0, pointerEvents: 'none' }}>{formatGameTitle(rom.name)}</h3>
      <span className="rom-badge" style={{ position: 'relative', zIndex: 0, pointerEvents: 'none' }}>{getCoreBadge(detectCore(rom.name))}</span>
    </div>
  );
}

const formatGameTitle = (name) => {
  const base = name.replace(/\.[^/.]+$/, "");
  if (base.toLowerCase() === 'mslug3') return 'Metal Slug 3';
  return base;
};

const getCoreBadge = (coreName) => {
  if (coreName === 'fceumm') return 'NES';
  if (coreName === 'snes9x') return 'SNES';
  if (coreName === 'mgba') return 'GBA';
  if (coreName === 'gambatte') return 'GAME BOY';
  if (coreName === 'genesis_plus_gx') return 'SEGA';
  if (coreName === 'fbalpha2012_neogeo') return 'NEO GEO';
  return coreName ? coreName.toUpperCase() : '';
};

const detectCore = (name) => {
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'nes') return 'fceumm'
  if (ext === 'smc' || ext === 'sfc') return 'snes9x'
  if (ext === 'gba') return 'mgba'
  if (ext === 'gb' || ext === 'gbc') return 'gambatte'
  if (ext === 'gen' || ext === 'md') return 'genesis_plus_gx'
  if (ext === 'zip' || name.toLowerCase().includes('slug') || name.toLowerCase().includes('neogeo')) return 'fbalpha2012_neogeo'
  return null
}

const getSystemName = (ext) => {
  if (ext === 'nes') return 'Nintendo - Nintendo Entertainment System'
  if (ext === 'smc' || ext === 'sfc') return 'Nintendo - Super Nintendo Entertainment System'
  if (ext === 'gba') return 'Nintendo - Game Boy Advance'
  if (ext === 'gb') return 'Nintendo - Game Boy'
  if (ext === 'gbc') return 'Nintendo - Game Boy Color'
  if (ext === 'gen' || ext === 'md') return 'Sega - Mega Drive - Genesis'
  if (ext === 'zip') return 'SNK - Neo Geo'
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
  const [uploadProgress, setUploadProgress] = useState(null)
  const [downloadingRom, setDownloadingRom] = useState(null)

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'PON_TU_URL_AQUI'

  const fetchCloudRoms = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoadingRoms(true);
    try {
      const { data: romsData, error: romsErr } = await supabase.storage.from('emulamadro').list('roms', { limit: 500 });
      const { data: coversData } = await supabase.storage.from('emulamadro').list('covers', { limit: 500 });
      
      if (romsErr) throw romsErr;
      
      if (romsData) {
        const rawRoms = romsData.filter(f => f.name && !f.name.startsWith('.') && f.name !== 'trash' && f.id);
        
        // Agrupar archivos fragmentados (.part1, .part2, etc.) en un único juego
        const chunkMap = new Map();
        const finalRoms = [];

        for (const file of rawRoms) {
          const partMatch = file.name.match(/^(.*)\.part(\d+)$/i);
          if (partMatch) {
            const baseName = partMatch[1];
            const partNum = parseInt(partMatch[2], 10);
            if (!chunkMap.has(baseName)) {
              chunkMap.set(baseName, {
                id: `chunked-${baseName}`,
                name: baseName,
                isChunked: true,
                parts: [],
                metadata: { size: 0 }
              });
            }
            const chunk = chunkMap.get(baseName);
            chunk.parts.push({ name: file.name, num: partNum });
            chunk.metadata.size += (file.metadata?.size || 0);
          } else {
            finalRoms.push(file);
          }
        }

        for (const chunk of chunkMap.values()) {
          chunk.parts.sort((a, b) => a.num - b.num);
          chunk.parts = chunk.parts.map(p => p.name);
          finalRoms.push(chunk);
        }

        setCloudRoms(finalRoms);
      }

      if (coversData) setCloudCovers(coversData.filter(f => f.name && !f.name.startsWith('.') && f.name !== 'trash' && f.id));
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
        alert("Formato no soportado. Usa .nes, .smc, .sfc, .gba, .gb, .gbc, .gen, .md, .zip")
        return
      }
      setFileName(file.name)
      setCore(detectedCore)
      setRomFile(file)
    }
    event.target.value = '';
  }

  const handleCloudUpload = async (event) => {
    const rawFiles = Array.from(event.target.files || []);
    if (rawFiles.length === 0) return;

    // Filtrar archivos con formato compatible
    const validFiles = rawFiles.filter(file => detectCore(file.name) !== null);
    const unsupportedCount = rawFiles.length - validFiles.length;

    if (validFiles.length === 0) {
      alert("Ninguno de los archivos seleccionados tiene un formato compatible (.nes, .smc, .sfc, .gba, .gb, .gbc, .gen, .md, .zip).");
      event.target.value = '';
      return;
    }

    // Comprobar juegos ya subidos para ignorarlos y no duplicar
    const existingNames = new Set(cloudRoms.map(r => r.name.toLowerCase()));
    const filesToUpload = validFiles.filter(file => !existingNames.has(file.name.toLowerCase()));
    const alreadyExistingCount = validFiles.length - filesToUpload.length;

    // Si todos los juegos seleccionados ya estaban subidos, no pasa nada
    if (filesToUpload.length === 0) {
      if (validFiles.length === 1) {
        alert("Este juego ya se encuentra subido en tu biblioteca.");
      } else {
        alert(`Los ${alreadyExistingCount} juegos seleccionados ya estaban en tu biblioteca.`);
      }
      event.target.value = '';
      return;
    }

    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadProgress({ current: i + 1, total: filesToUpload.length, fileName: file.name });

      try {
        if (file.size > 45 * 1024 * 1024) {
          // Si el archivo supera 45MB, fragmentarlo automáticamente para respetar el límite de Supabase
          const CHUNK_SIZE = 40 * 1024 * 1024;
          const totalParts = Math.ceil(file.size / CHUNK_SIZE);
          for (let p = 0; p < totalParts; p++) {
            const start = p * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunkBlob = file.slice(start, end);
            const partFileName = `${file.name}.part${p + 1}`;
            const { error: partErr } = await supabase.storage
              .from('emulamadro')
              .upload(`roms/${partFileName}`, chunkBlob, { upsert: false });
            if (partErr) throw partErr;
          }
          uploadedCount++;
        } else {
          const { error } = await supabase.storage.from('emulamadro').upload(`roms/${file.name}`, file, { upsert: false });
          if (error) {
            // Si el servidor indica que ya existe, no pasa nada (se omite)
            const isDuplicate = error.statusCode === '409' || 
                                error.message?.toLowerCase().includes('already exists') || 
                                error.error === 'Duplicate';
            if (!isDuplicate) {
              console.error(`Error subiendo ${file.name}:`, error);
              failedCount++;
            }
          } else {
            uploadedCount++;
          }
        }
      } catch (err) {
        console.error(`Error subiendo ${file.name}:`, err);
        failedCount++;
      }
    }

    setUploadProgress(null);
    event.target.value = '';
    await fetchCloudRoms();

    // Resumen amigable
    const summary = [];
    if (uploadedCount > 0) summary.push(`✅ ${uploadedCount} juego(s) subido(s) con éxito.`);
    if (alreadyExistingCount > 0) summary.push(`ℹ️ ${alreadyExistingCount} juego(s) ya existían y se omitieron.`);
    if (unsupportedCount > 0) summary.push(`⚠️ ${unsupportedCount} archivo(s) omitidos por formato no soportado.`);
    if (failedCount > 0) summary.push(`❌ ${failedCount} juego(s) fallaron al subirse.`);

    if (summary.length > 0) {
      alert(summary.join('\n'));
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
    const customCover = cloudCovers.find(c => c.name.toLowerCase().startsWith(baseName.toLowerCase() + '.'));
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

  const playCloudRom = async (romOrName) => {
    const romObj = typeof romOrName === 'string' ? cloudRoms.find(r => r.name === romOrName) : romOrName;
    const romName = typeof romOrName === 'string' ? romOrName : romOrName.name;
    const detectedCore = detectCore(romName);
    if (!detectedCore) {
      alert("No se pudo detectar el núcleo emulador para este juego.");
      return;
    }

    if (romObj?.isChunked && romObj.parts?.length > 0) {
      setDownloadingRom(romName);
      try {
        const urls = romObj.parts.map(p => supabase.storage.from('emulamadro').getPublicUrl(`roms/${p}`).data.publicUrl);
        const blobs = await Promise.all(
          urls.map(async (u, idx) => {
            const res = await fetch(u);
            if (!res.ok) throw new Error(`Error descargando parte ${idx + 1}`);
            return res.blob();
          })
        );
        const mergedFile = new File(blobs, romName, { type: 'application/zip' });
        setFileName(romName);
        setCore(detectedCore);
        setRomFile(mergedFile);
      } catch (err) {
        console.error("Error descargando juego fragmentado:", err);
        alert("Ocurrió un error al descargar el juego desde la nube. Por favor intenta de nuevo.");
      } finally {
        setDownloadingRom(null);
      }
      return;
    }

    const { data } = supabase.storage.from('emulamadro').getPublicUrl(`roms/${romName}`);
    setFileName(romName);
    setCore(detectedCore);
    setRomFile({ name: romName, url: data.publicUrl, isCloud: true });
  }

  const handleDeleteCloudRom = async (romName) => {
    const displayName = formatGameTitle(romName);
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${displayName}" de tu biblioteca en la nube?\n\nEsta acción eliminará el archivo y no volverá a aparecer.`)) {
      return;
    }

    try {
      const baseName = romName.replace(/\.[^/.]+$/, "");
      const customCover = cloudCovers.find(c => c.name.toLowerCase().startsWith(baseName.toLowerCase() + '.'));
      const romObj = cloudRoms.find(r => r.name === romName);
      const filesToDelete = (romObj?.isChunked && romObj.parts) ? romObj.parts : [romName];
      const timestamp = Date.now();

      for (const fileName of filesToDelete) {
        const romPath = `roms/${fileName}`;
        const trashRomPath = `.trash/roms/${timestamp}_${fileName}`;

        // 1. Intentar borrado directo mediante remove
        const { data: removeData } = await supabase.storage
          .from('emulamadro')
          .remove([romPath]);

        // Si remove no eliminó ningún archivo (típico cuando Supabase RLS bloquea DELETE para rol anon sin lanzar error),
        // trasladamos el archivo fuera de 'roms/' a '.trash/' mediante move (que sí está permitido con UPDATE/INSERT)
        const wasActuallyDeleted = removeData && removeData.length > 0;
        if (!wasActuallyDeleted) {
          console.warn(`[Storage] remove() no devolvió confirmación para ${romPath}. Moviendo fuera de roms/ a papelera.`);
          const { error: moveErr } = await supabase.storage
            .from('emulamadro')
            .move(romPath, trashRomPath);

          if (moveErr) {
            console.error("Error moviendo ROM a papelera:", moveErr);
          } else {
            supabase.storage.from('emulamadro').remove([trashRomPath]).catch(() => {});
          }
        }
      }

      // Si había carátula personalizada, borrarla o moverla también
      if (customCover) {
        const coverPath = `covers/${customCover.name}`;
        const trashCoverPath = `.trash/covers/${timestamp}_${customCover.name}`;
        const { data: covDelData } = await supabase.storage.from('emulamadro').remove([coverPath]);
        if (!covDelData || covDelData.length === 0) {
          await supabase.storage.from('emulamadro').move(coverPath, trashCoverPath).catch(() => {});
        }
      }

      setCloudRoms(prev => prev.filter(r => r.name !== romName));
      if (customCover) {
        setCloudCovers(prev => prev.filter(c => c.name !== customCover.name));
      }
      setFailedImages(prev => {
        const next = new Set(prev);
        next.delete(romName);
        return next;
      });
    } catch (err) {
      console.error("Error eliminando ROM:", err);
      alert("Ocurrió un error inesperado al eliminar el juego.");
    }
  };

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
                  <label 
                    className="upload-cloud-btn"
                    style={uploadProgress ? { opacity: 0.85, pointerEvents: 'none', cursor: 'wait' } : {}}
                  >
                    {uploadProgress ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Subiendo ({uploadProgress.current}/{uploadProgress.total})...
                      </>
                    ) : (
                      <>
                        <Upload size={18} /> Subir Juegos a la Nube
                      </>
                    )}
                    <input 
                      type="file" 
                      multiple 
                      accept=".nes,.smc,.sfc,.gba,.gb,.gbc,.gen,.md,.zip" 
                      onChange={handleCloudUpload} 
                      disabled={!!uploadProgress}
                    />
                  </label>
                </div>

                <div className="rom-grid">
                  {loadingRoms ? (
                    <p className="loading-text">Cargando biblioteca...</p>
                  ) : cloudRoms.length > 0 ? (
                    cloudRoms.map((rom) => (
                      <RomCard
                        key={rom.id || rom.name}
                        rom={rom}
                        getCoverUrl={getCoverUrl}
                        failedImages={failedImages}
                        setFailedImages={setFailedImages}
                        handleCoverUpload={handleCoverUpload}
                        playCloudRom={playCloudRom}
                        detectCore={detectCore}
                        handleDeleteCloudRom={handleDeleteCloudRom}
                        downloadingRom={downloadingRom}
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
                <input type="file" accept=".nes,.smc,.sfc,.gba,.gb,.gbc,.gen,.md,.zip" onChange={handleLocalPlay} />
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

      {downloadingRom && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'rgba(20, 20, 30, 0.95)',
          border: '1px solid #3b82f6',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 9999,
          color: 'white',
          fontSize: '14px',
          fontWeight: 500
        }}>
          <Loader2 size={20} className="animate-spin" color="#3b82f6" />
          <span>Descargando y preparando <strong>{formatGameTitle(downloadingRom)}</strong>...</span>
        </div>
      )}
      
      <footer className="footer">
        <p>Impulsado por WebAssembly (Nostalgist & Libretro)</p>
      </footer>
    </div>
  )
}

export default App