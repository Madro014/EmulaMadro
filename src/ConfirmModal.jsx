import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

export default function ConfirmModal({
  show,
  title = 'Confirmar acción',
  message = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 4000 }} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal-content confirm-modal-card">
        <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
          <h3 id="confirm-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <AlertTriangle size={20} color={danger ? '#f87171' : '#fbbf24'} />
            {title}
          </h3>
          <button type="button" onClick={onCancel} aria-label="Cerrar confirmación">
            <X size={18} />
          </button>
        </div>

        <p style={{ color: '#cbd5e1', fontSize: '0.94rem', lineHeight: 1.5, margin: '0 0 1.4rem', whiteSpace: 'pre-line' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="settings-btn"
            data-console-autofocus="true"
            data-console-cancel="true"
            onClick={onCancel}
            style={{ background: 'rgba(148, 163, 184, 0.18)', borderColor: 'rgba(148, 163, 184, 0.35)' }}
          >
            <X size={16} /> {cancelLabel}
          </button>
          <button
            type="button"
            className="settings-btn"
            onClick={onConfirm}
            style={{
              background: danger ? '#dc2626' : '#2563eb',
              borderColor: danger ? 'rgba(248, 113, 113, 0.5)' : 'rgba(96, 165, 250, 0.5)',
              fontWeight: 700,
            }}
          >
            <Check size={16} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
