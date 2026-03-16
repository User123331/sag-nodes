// Logarithmic node sizing based on Deezer nb_fan count
// Math.log10(1000 fans + 1) ≈ 3, Math.log10(1M fans + 1) ≈ 6
// Minimum size 1 for artists with no fan data

const MIN_NODE_VAL = 1;

export function nodeVal(nbFan: number | undefined): number {
  if (nbFan === undefined || nbFan <= 0) return MIN_NODE_VAL;
  return Math.max(MIN_NODE_VAL, Math.log10(nbFan + 1));
}

// Radius for Canvas rendering: nodeVal scaled to pixels
// react-force-graph-2d uses nodeRelSize (default 4) -> area = nodeVal * nodeRelSize^2
// For custom nodeCanvasObject, compute radius directly
const BASE_RADIUS = 4;

export function nodeRadius(nbFan: number | undefined): number {
  return BASE_RADIUS * Math.sqrt(nodeVal(nbFan));
}
