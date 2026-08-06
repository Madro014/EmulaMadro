import React from 'react';
import { Settings, Maximize, Save, Upload, HardDriveDownload } from 'lucide-react';

export default function EmulatorToolbar({
  openSettings,
  toggleFullscreen,
  handleQuickSave,
  handleLoadStateBrowser,
  handleDownloadSave,
  handleUploadState,
  fileInputRef
}) {
  return (
    <div className="controls-hint" style={{ flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
      <button className="settings-btn" onClick={openSettings}>
        <Settings size={18} /> Mapeo
      </button>
      <button className="settings-btn" onClick={toggleFullscreen}>
        <Maximize size={18} /> Pantalla Completa
      </button>
      
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}></div>
      
      <button className="settings-btn" onClick={handleQuickSave} style={{ background: 'var(--accent-color)' }}>
        <Save size={18} /> Guardar (Local)
      </button>
      <button className="settings-btn" onClick={handleLoadStateBrowser} style={{ background: '#10b981' }}>
        <HardDriveDownload size={18} /> Cargar (Local)
      </button>
      
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}></div>

      <button className="settings-btn" onClick={handleDownloadSave} style={{ background: '#8b5cf6' }}>
        <Save size={18} /> Bajar Respaldo
      </button>
      <label className="settings-btn" style={{ background: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Upload size={18} /> Subir Respaldo
        <input 
          type="file" 
          accept=".state" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleUploadState}
        />
      </label>
    </div>
  );
}
