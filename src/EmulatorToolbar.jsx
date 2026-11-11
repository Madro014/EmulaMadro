import React, { useState } from 'react';
import {
  Settings,
  Maximize,
  Save,
  Upload,
  HardDriveDownload,
  Users,
  MessageSquare,
  Layers,
  Trash2,
  Database,
  Cloud,
  FileDown,
  FolderOpen,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const SLOT_NUMBERS = [1, 2, 3];

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    return date.toLocaleString('es-CO', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getStrategyBadgeMeta(strategyKey) {
  switch (strategyKey) {
    case 'cloud':
      return { shortLabel: 'Nube', Icon: Cloud, colorClass: 'cloud' };
    case 'file':
      return { shortLabel: '.state', Icon: FileDown, colorClass: 'file' };
    case 'local':
    default:
      return { shortLabel: 'Local', Icon: Database, colorClass: 'local' };
  }
}

export default function EmulatorToolbar({
  openSettings,
  openMultiplayer,
  toggleFullscreen,
  handleQuickSave,
  handleLoadStateBrowser,
  handleDownloadSave,
  handleUploadState,
  fileInputRef,
  isMultiplayerConnected,
  toggleChat,
  isGuest = false,
  // Props del Patrón Strategy
  slots = [],
  activeSlot = 1,
  busy = false,
  strategyKey = 'local',
  activeStrategyName = 'Local (IndexedDB)',
  activeStrategyClass = 'IndexedDBSaveStrategy',
  onSelectSlot,
  onChangeStrategy,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onRefreshSlots,
}) {
  const [showSlots, setShowSlots] = useState(false);
  const { shortLabel, Icon: StrategyIcon, colorClass } = getStrategyBadgeMeta(strategyKey);

  const toggleSlotsPanel = () => {
    setShowSlots((prev) => {
      const next = !prev;
      if (next && onRefreshSlots) {
        onRefreshSlots();
      }
      return next;
    });
  };

  return (
    <div className="toolbar-strategy-wrapper">
      {showSlots && (
        <div className="slots-drawer" role="region" aria-label="Gestor de Slots y Estrategias de Guardado">
          <div className="slots-drawer-header">
            <div className="slots-drawer-title">
              <Layers size={18} />
              <span>Slots de Guardado</span>
              <span className={`strategy-pill ${colorClass}`}>
                <StrategyIcon size={12} />
                {activeStrategyName}
              </span>
            </div>
            <div className="slots-drawer-actions">
              <button
                type="button"
                className="slots-icon-btn"
                onClick={onRefreshSlots}
                disabled={busy}
                title="Actualizar lista de slots"
                aria-label="Actualizar slots"
              >
                <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                className="slots-icon-btn"
                onClick={() => setShowSlots(false)}
                title="Cerrar panel de slots"
                aria-label="Cerrar slots"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Selector de Estrategia de Guardado (Demostración Patrón Strategy) */}
          <div className="strategy-selector-box">
            <div className="strategy-selector-top">
              <label htmlFor="save-strategy-select" className="strategy-selector-label">
                Motor de Guardado (Patrón Strategy)
              </label>
              <span className="strategy-context-chip" title="Delegación activa en tiempo de ejecución">
                SaveManagerContext ➔ {activeStrategyClass}
              </span>
            </div>
            <select
              id="save-strategy-select"
              value={strategyKey}
              onChange={(e) => onChangeStrategy?.(e.target.value)}
              disabled={busy}
              className="strategy-select-input"
            >
              <option value="local">Local (IndexedDB)</option>
              <option value="cloud">Nube (Supabase Cloud)</option>
              <option value="file">Archivo Físico (.state)</option>
            </select>
          </div>

          {isGuest && (
            <div className="slots-guest-notice">
              Solo el Anfitrión (Host) puede guardar o cargar estados de partida durante el modo online.
            </div>
          )}

          <div className="slots-list">
            {SLOT_NUMBERS.map((slotNum) => {
              const saved = slots.find((s) => Number(s.slot) === slotNum);
              const isSelected = Number(activeSlot) === slotNum;
              const canLoad = Boolean(saved) || strategyKey === 'file';

              return (
                <div key={slotNum} className={`slot-row ${isSelected ? 'active-slot' : ''}`}>
                  <button
                    type="button"
                    className="slot-row-info slot-row-info-btn"
                    onClick={() => onSelectSlot?.(slotNum)}
                    title={`Seleccionar Slot ${slotNum} como slot rápido actual`}
                  >
                    <div className="slot-row-title">
                      <strong>Slot {slotNum}</strong>
                      {isSelected && <span className="slot-badge active">Actual</span>}
                      {saved ? (
                        <span className="slot-badge saved">Guardado</span>
                      ) : (
                        <span className="slot-badge empty">Vacío</span>
                      )}
                      {saved?.legacy && <span className="slot-badge legacy">v1</span>}
                    </div>
                    <div className="slot-row-meta">
                      {saved ? (
                        <>
                          <span>{formatDateTime(saved.updatedAt)}</span>
                          <span>•</span>
                          <span>{formatBytes(saved.size)}</span>
                          {saved.fileName && (
                            <>
                              <span>•</span>
                              <span className="slot-filename">{saved.fileName}</span>
                            </>
                          )}
                        </>
                      ) : strategyKey === 'file' ? (
                        <span>Exporta a tu PC o presiona Cargar para abrir un archivo .state</span>
                      ) : (
                        <span>Sin partida almacenada en {shortLabel}</span>
                      )}
                    </div>
                  </button>

                  <div className="slot-row-buttons">
                    <button
                      type="button"
                      className="slot-action-btn save"
                      onClick={() => onSaveSlot?.(slotNum)}
                      disabled={busy || isGuest}
                      title={`Guardar en Slot ${slotNum} usando ${activeStrategyName}`}
                    >
                      {busy && isSelected ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Guardar
                    </button>

                    <button
                      type="button"
                      className="slot-action-btn load"
                      onClick={() => onLoadSlot?.(slotNum)}
                      disabled={busy || isGuest || !canLoad}
                      title={
                        strategyKey === 'file' && !saved
                          ? 'Seleccionar archivo .state del disco'
                          : `Cargar Slot ${slotNum} desde ${activeStrategyName}`
                      }
                    >
                      {strategyKey === 'file' && !saved ? <FolderOpen size={14} /> : <HardDriveDownload size={14} />}
                      Cargar
                    </button>

                    {strategyKey === 'file' && saved && (
                      <button
                        type="button"
                        className="slot-action-btn secondary"
                        onClick={() => onLoadSlot?.(slotNum, { forceFilePicker: true })}
                        disabled={busy || isGuest}
                        title="Elegir otro archivo .state del disco"
                      >
                        <FolderOpen size={14} />
                      </button>
                    )}

                    {saved && (
                      <button
                        type="button"
                        className="slot-action-btn delete"
                        onClick={() => onDeleteSlot?.(slotNum)}
                        disabled={busy || isGuest}
                        title={`Eliminar Slot ${slotNum}`}
                        aria-label={`Eliminar Slot ${slotNum}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="controls-hint" style={{ flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        <button className="settings-btn" onClick={openSettings}>
          <Settings size={18} /> Mapeo
        </button>
        <button className="settings-btn" onClick={openMultiplayer} style={{ background: '#3b82f6' }}>
          <Users size={18} /> Multijugador
        </button>

        {isMultiplayerConnected && (
          <button
            className="settings-btn"
            onClick={toggleChat}
            style={{ background: '#8b5cf6', borderColor: '#a78bfa', fontWeight: 'bold' }}
            title="Abrir chat en partida (Atajo: presiona tecla T)"
          >
            <MessageSquare size={18} /> Chat Online (T)
          </button>
        )}

        <button className="settings-btn" onClick={toggleFullscreen}>
          <Maximize size={18} /> Pantalla Completa
        </button>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}></div>

        <button
          className={`settings-btn slots-toggle-btn ${showSlots ? 'active' : ''}`}
          onClick={toggleSlotsPanel}
          title={`Abrir gestor de Slots y Estrategias (Actual: ${activeStrategyName})`}
        >
          <Layers size={18} />
          <span>Slots</span>
          <span className={`strategy-mini-chip ${colorClass}`}>
            <StrategyIcon size={12} />
            {shortLabel}
          </span>
        </button>

        <button
          className="settings-btn"
          onClick={handleQuickSave}
          disabled={busy || isGuest}
          style={{ background: 'var(--accent-color)', opacity: busy || isGuest ? 0.6 : 1 }}
          title={`Guardar en Slot ${activeSlot} usando ${activeStrategyName}`}
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Guardar (Slot {activeSlot})
        </button>

        <button
          className="settings-btn"
          onClick={handleLoadStateBrowser}
          disabled={busy || isGuest}
          style={{ background: '#10b981', opacity: busy || isGuest ? 0.6 : 1 }}
          title={`Cargar Slot ${activeSlot} desde ${activeStrategyName}`}
        >
          <HardDriveDownload size={18} /> Cargar (Slot {activeSlot})
        </button>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }}></div>

        <button
          className="settings-btn"
          onClick={handleDownloadSave}
          disabled={busy || isGuest}
          style={{ background: '#6366f1', opacity: busy || isGuest ? 0.6 : 1 }}
          title="Exportar respaldo rápido como archivo .state"
        >
          <FileDown size={18} /> Bajar Respaldo
        </button>

        <label
          className="settings-btn"
          style={{
            background: '#f59e0b',
            cursor: isGuest ? 'not-allowed' : 'pointer',
            opacity: isGuest ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Upload size={18} /> Subir Respaldo
          <input
            type="file"
            accept=".state,.bin"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleUploadState}
            disabled={isGuest}
          />
        </label>
      </div>
    </div>
  );
}
