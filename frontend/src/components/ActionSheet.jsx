import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ActionSheet.css';

// Menu d'actions affiché en bas d'écran (usage tactile).
// actions : [{ label, icon, onSelect, danger?, disabled? }] — les valeurs falsy sont ignorées.
export default function ActionSheet({ title, actions, onClose }) {
  const sheetRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    sheetRef.current?.querySelector('button:not([disabled])')?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus?.();
    };
  }, []);

  return createPortal(
    <div className="action-sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Actions'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="action-sheet-grabber" aria-hidden="true" />
        {title && <div className="action-sheet-title">{title}</div>}
        <div className="action-sheet-list">
          {actions.filter(Boolean).map(action => (
            <button
              key={action.label}
              type="button"
              className={`action-sheet-item${action.danger ? ' is-danger' : ''}`}
              disabled={action.disabled}
              onClick={() => {
                onClose();
                action.onSelect();
              }}
            >
              {action.icon && <span className="action-sheet-icon" aria-hidden="true">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="action-sheet-cancel" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>,
    document.body
  );
}
