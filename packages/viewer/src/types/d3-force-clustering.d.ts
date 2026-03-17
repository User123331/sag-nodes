declare module 'd3-force-clustering' {
  interface ClusteringForce<NodeDatum> {
    clusterId(fn: (node: NodeDatum) => string): this;
    strength(v: number | ((clusterId: string, nodes: NodeDatum[]) => number)): this;
    weight(fn: (node: NodeDatum) => number): this;
    distanceMin(v: number): this;
  }
  function forceClustering<NodeDatum>(): ClusteringForce<NodeDatum>;
  export default forceClustering;
}
