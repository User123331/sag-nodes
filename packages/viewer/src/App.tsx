import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useGraphStore } from './store/index.js';
import { SearchBar } from './components/SearchBar.js';
import { GraphCanvas } from './components/GraphCanvas.js';
import { DetailPanel } from './components/DetailPanel.js';
import './App.css';

export function App() {
  const initEngine = useGraphStore(s => s.initEngine);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  return (
    <div className="app">
      <GraphCanvas />
      <SearchBar />
      <DetailPanel />
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
