import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useGraphStore } from './store/index.js';
import { SearchBar } from './components/SearchBar.js';
import { GraphCanvas } from './components/GraphCanvas.js';
import { DetailPanel } from './components/DetailPanel.js';
import { ControlPanel } from './components/ControlPanel.js';
import { ShortcutOverlay } from './components/ShortcutOverlay.js';
import { useUrlState } from './hooks/useUrlState.js';
import './App.css';

export function App() {
  const initEngine = useGraphStore(s => s.initEngine);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  useUrlState();

  return (
    <div className="app">
      <ControlPanel />
      <GraphCanvas />
      <SearchBar />
      <DetailPanel />
      <ShortcutOverlay />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--color-toast-bg)',
            border: '1px solid var(--color-toast-border)',
            color: 'var(--color-text-primary)',
            fontFamily: 'ui-monospace, monospace',
          },
        }}
      />
    </div>
  );
}
