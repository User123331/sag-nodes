import { useEffect } from 'react';
import { useGraphStore } from '../store/index.js';

export function encodeHash(seed: string, depth: number, providers: string[]): string {
  const params = new URLSearchParams();
  params.set('seed', seed);
  params.set('depth', String(depth));
  params.set('providers', providers.join(','));
  return '#' + params.toString();
}

export function decodeHash(hash: string): { seed?: string; depth?: number; providers?: string[] } {
  if (!hash || hash === '#') return {};
  const params = new URLSearchParams(hash.slice(1));
  const result: { seed?: string; depth?: number; providers?: string[] } = {};

  const seed = params.get('seed');
  if (seed !== null) result.seed = seed;

  const depthStr = params.get('depth');
  if (depthStr !== null) {
    const depth = parseInt(depthStr, 10);
    if (!isNaN(depth)) result.depth = depth;
  }

  const providersStr = params.get('providers');
  if (providersStr !== null) {
    result.providers = providersStr.split(',');
  }

  return result;
}

export function useUrlState(): void {
  const seedMbid = useGraphStore((s) => s.seedMbid);
  const maxDepth = useGraphStore((s) => s.maxDepth);
  const enabledProviders = useGraphStore((s) => s.enabledProviders);
  const isExploring = useGraphStore((s) => s.isExploring);
  const engine = useGraphStore((s) => s.engine);
  const setGraph = useGraphStore((s) => s.setGraph);
  const setMaxDepth = useGraphStore((s) => s.setMaxDepth);

  // On mount: read hash and restore state
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;
    const { seed, depth, providers } = decodeHash(hash);
    if (!seed || !engine) return;

    if (depth !== undefined) setMaxDepth(depth);

    void engine.exploreByMbid(seed).then((result) => {
      if (!result.ok) {
        // Dynamic import to avoid bundling toast at module load time
        import('sonner').then(({ toast }) => {
          toast.error('Shared artist not found');
        }).catch(() => {});
        history.replaceState(null, '', location.pathname);
        return;
      }
      setGraph(result.value);
      // providers restored from URL if available (future enhancement)
      void providers; // acknowledged, used for future provider restoration
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // On state changes: write hash when graph exists and not currently exploring
  useEffect(() => {
    if (seedMbid === null || isExploring) return;
    const providers = [...enabledProviders];
    history.replaceState(null, '', encodeHash(seedMbid, maxDepth, providers));
  }, [seedMbid, maxDepth, enabledProviders, isExploring]);
}
