import { useGraphStore } from '../store/index.js';
import './ShortcutOverlay.css';

const SHORTCUTS: Array<{ key: string; description: string }> = [
  { key: 'Tab', description: 'Next node (by similarity)' },
  { key: 'Shift+Tab', description: 'Previous node' },
  { key: '↑ ↓ ← →', description: 'Navigate to nearest node' },
  { key: 'Enter', description: 'Expand focused node' },
  { key: 'Escape', description: 'Deselect / close panel' },
  { key: '/', description: 'Focus search' },
  { key: '?', description: 'Toggle this overlay' },
];

export function ShortcutOverlay() {
  const isShortcutOverlayOpen = useGraphStore(s => s.isShortcutOverlayOpen);
  const toggleShortcutOverlay = useGraphStore(s => s.toggleShortcutOverlay);

  if (!isShortcutOverlayOpen) return null;

  return (
    <div className="shortcut-overlay-backdrop" onClick={toggleShortcutOverlay}>
      <div
        className="shortcut-overlay"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
      >
        <h2 className="shortcut-overlay-title">Keyboard Shortcuts</h2>
        <div className="shortcut-overlay-list">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="shortcut-row">
              <kbd className="shortcut-key">{key}</kbd>
              <span className="shortcut-description">{description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
