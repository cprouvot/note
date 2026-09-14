// Comparaison du contenu d'une carte avec la dernière version connue du serveur

// Propriétés propres à un onglet (sélection, mesures, état de glissement) : ne justifient pas une sauvegarde
const VOLATILE_NODE_KEYS = ['selected', 'dragging', 'positionAbsolute', 'width', 'height', 'resizing'];
const VOLATILE_EDGE_KEYS = ['selected'];

const omit = (obj, keys) => {
  const copy = { ...obj };
  keys.forEach(key => delete copy[key]);
  return copy;
};

// JSON à clés triées : Postgres (jsonb) ne conserve pas l'ordre des clés
const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .filter(key => value[key] !== undefined)
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

export const serializeBoardContent = (nodes = [], edges = []) => stableStringify({
  nodes: nodes.map(node => omit(node, VOLATILE_NODE_KEYS)),
  edges: edges.map(edge => omit(edge, VOLATILE_EDGE_KEYS)),
});
