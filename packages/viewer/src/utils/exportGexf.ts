import type { ForceNode, ForceLink } from '../types/graph.js';

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildGexf(nodes: ForceNode[], links: ForceLink[], seedName: string): string {
  const nodesXml = nodes
    .map((n) => {
      const attrValues = [
        `          <attvalue for="0" value="${escapeXml(n.name)}"/>`,
        ...(n.disambiguation !== undefined
          ? [`          <attvalue for="1" value="${escapeXml(n.disambiguation)}"/>`]
          : []),
        ...(n.metadata?.nb_fan !== undefined
          ? [`          <attvalue for="2" value="${n.metadata.nb_fan}"/>`]
          : []),
        `          <attvalue for="3" value="${escapeXml(n.sources.join(','))}"/>`,
      ];
      return [
        `      <node id="${escapeXml(n.mbid)}" label="${escapeXml(n.name)}">`,
        `        <attvalues>`,
        ...attrValues,
        `        </attvalues>`,
        `      </node>`,
      ].join('\n');
    })
    .join('\n');

  const edgesXml = links
    .map((l, i) => {
      return [
        `      <edge id="${i}" source="${escapeXml(l.sourceMbid)}" target="${escapeXml(l.targetMbid)}" weight="${l.fusedScore}">`,
        `        <attvalues>`,
        `          <attvalue for="0" value="${l.fusedScore}"/>`,
        `        </attvalues>`,
        `      </edge>`,
      ].join('\n');
    })
    .join('\n');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<gexf xmlns="http://gexf.net/1.3" version="1.3">`,
    `  <meta>`,
    `    <creator>similar-artists-graph</creator>`,
    `    <description>Similarity graph for ${escapeXml(seedName)}</description>`,
    `  </meta>`,
    `  <graph defaultedgetype="undirected">`,
    `    <attributes class="node">`,
    `      <attribute id="0" title="name" type="string"/>`,
    `      <attribute id="1" title="disambiguation" type="string"/>`,
    `      <attribute id="2" title="nb_fan" type="float"/>`,
    `      <attribute id="3" title="sources" type="string"/>`,
    `    </attributes>`,
    `    <attributes class="edge">`,
    `      <attribute id="0" title="fusedScore" type="float"/>`,
    `    </attributes>`,
    `    <nodes>`,
    nodesXml,
    `    </nodes>`,
    `    <edges>`,
    edgesXml,
    `    </edges>`,
    `  </graph>`,
    `</gexf>`,
  ].join('\n');
}

export function downloadGexf(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
