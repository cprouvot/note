// Calcul de disposition des arbres de la carte mentale (fonctions pures, sans état React)

export const X_OFFSET = 60; // Espace horizontal entre un parent et ses enfants
export const Y_OFFSET = 20; // Espace vertical entre deux frères

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 40;

const isLeftEdge = (edge) => edge.sourceHandle === 'source-left';

// Même règle que l'affichage (MindMap.jsx) : le repli d'un côté masque les enfants reliés par la poignée de ce côté
const isEdgeCollapsed = (parentData, edge) => isLeftEdge(edge)
  ? Boolean(parentData?.collapsedLeft)
  : Boolean(parentData?.collapsedRight || parentData?.collapsed);

export const COLLAPSE_KEYS = ['collapsedLeft', 'collapsedRight', 'collapsed'];

export const getNodeBox = (node) => ({
  width: node?.width || DEFAULT_WIDTH,
  height: node?.height || DEFAULT_HEIGHT,
});

// Remonte les liens jusqu'au nœud sans parent (protégé contre les cycles)
export const findTreeRoot = (nodeId, edges) => {
  let current = nodeId;
  const visited = new Set([current]);
  for (;;) {
    const parentEdge = edges.find(e => e.target === current);
    if (!parentEdge || visited.has(parentEdge.source)) return current;
    current = parentEdge.source;
    visited.add(current);
  }
};

export const getDescendantIds = (parentId, edges, visited = new Set([parentId])) => {
  const result = [];
  for (const edge of edges) {
    if (edge.source !== parentId || visited.has(edge.target)) continue;
    visited.add(edge.target);
    result.push(edge.target, ...getDescendantIds(edge.target, edges, visited));
  }
  return result;
};

// Position initiale d'un nouvel enfant : sous toute la descendance existante du même côté,
// pour qu'il soit trié en dernier lors du rangement.
export const getNewChildPosition = (parentNode, nodes, edges, isLeft) => {
  const parentBox = getNodeBox(parentNode);
  const x = isLeft
    ? parentNode.position.x - X_OFFSET - DEFAULT_WIDTH
    : parentNode.position.x + parentBox.width + X_OFFSET;

  const sideChildIds = edges
    .filter(e => e.source === parentNode.id && isLeftEdge(e) === isLeft)
    .map(e => e.target);
  const branchIds = new Set(sideChildIds.flatMap(id => [id, ...getDescendantIds(id, edges)]));
  const branchNodes = nodes.filter(n => branchIds.has(n.id));

  if (branchNodes.length === 0) return { x, y: parentNode.position.y };
  const bottom = Math.max(...branchNodes.map(n => n.position.y + getNodeBox(n).height));
  return { x, y: bottom + Y_OFFSET };
};

// Disposition en arbre autour d'une racine fixe : enfants centrés verticalement sur leur parent,
// chaque sous-arbre réservant la hauteur totale de sa descendance.
// Retourne { [nodeId]: { x, y } } pour tous les descendants (la racine ne bouge pas).
export const computeTreeLayout = (nodes, edges, rootId) => {
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const rootNode = nodeById.get(rootId);
  if (!rootNode) return {};

  const visited = new Set([rootId]);
  const buildSubtree = (parentId, inheritedDirection) => {
    const parentData = nodeById.get(parentId).data;
    const childEdges = edges
      .filter(e => e.source === parentId && nodeById.has(e.target) && !visited.has(e.target))
      // Respecter l'ordre visuel actuel des enfants
      .sort((a, b) => nodeById.get(a.target).position.y - nodeById.get(b.target).position.y);

    return childEdges.map(edge => {
      visited.add(edge.target);
      const direction = inheritedDirection || (isLeftEdge(edge) ? 'left' : 'right');
      return {
        id: edge.target,
        direction,
        collapsed: isEdgeCollapsed(parentData, edge),
        children: buildSubtree(edge.target, direction)
      };
    });
  };

  const rootChildren = buildSubtree(rootId, null);

  const stackHeight = (childrenArray) =>
    childrenArray.reduce((sum, c) => sum + c.treeHeight, 0) + Math.max(0, childrenArray.length - 1) * Y_OFFSET;

  const computeHeights = (childrenArray) => {
    for (const child of childrenArray) {
      computeHeights(child.children);
      const ownHeight = getNodeBox(nodeById.get(child.id)).height;
      // Les enfants repliés (masqués) ne réservent aucune place
      child.treeHeight = Math.max(ownHeight, stackHeight(child.children.filter(c => !c.collapsed)));
    }
  };

  const positions = {};
  const positionStack = (childrenArray, parentX, parentCenterY, parentBox, isLeft) => {
    let startY = parentCenterY - stackHeight(childrenArray) / 2;
    for (const child of childrenArray) {
      const box = getNodeBox(nodeById.get(child.id));
      const childCenterY = startY + child.treeHeight / 2;
      const childX = isLeft ? parentX - X_OFFSET - box.width : parentX + parentBox.width + X_OFFSET;

      positions[child.id] = { x: childX, y: childCenterY - box.height / 2 };
      positionChildren(child.children, childX, childCenterY, box, isLeft);
      startY += child.treeHeight + Y_OFFSET;
    }
  };
  // Les enfants masqués sont empilés à part, centrés sur leur parent : ils le suivent sans pousser leurs voisins
  const positionChildren = (childrenArray, parentX, parentCenterY, parentBox, isLeft) => {
    positionStack(childrenArray.filter(c => !c.collapsed), parentX, parentCenterY, parentBox, isLeft);
    positionStack(childrenArray.filter(c => c.collapsed), parentX, parentCenterY, parentBox, isLeft);
  };

  const rootBox = getNodeBox(rootNode);
  const rootCenterY = rootNode.position.y + rootBox.height / 2;
  for (const isLeft of [true, false]) {
    const sideChildren = rootChildren.filter(c => (c.direction === 'left') === isLeft);
    computeHeights(sideChildren);
    positionChildren(sideChildren, rootNode.position.x, rootCenterY, rootBox, isLeft);
  }
  return positions;
};

export const applyPositions = (nodes, positions) =>
  nodes.map(n => (positions[n.id] ? { ...n, position: positions[n.id] } : n));
