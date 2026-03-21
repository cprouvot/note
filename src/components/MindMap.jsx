import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import { Plus, Square, Type } from 'lucide-react';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import RectangleNode from './RectangleNode';
import TextNode from './TextNode';
import './MindMap.css';

const nodeTypes = {
  custom: CustomNode,
  rectangle: RectangleNode,
  text: TextNode
};

const defaultNodes = [
  { id: '1', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Objectif Principal' }, zIndex: 0 },
];
const defaultEdges = [];

const BOARDS_STORAGE_KEY = 'miro_clone_boards_state';

function MindMapCanvas({ activeBoardId, boards, setBoards }) {
  const { getNodes, getEdges } = useReactFlow();

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];
  const [nodes, setNodes] = useState(activeBoard.nodes || defaultNodes);
  const [edges, setEdges] = useState(activeBoard.edges || defaultEdges);
  const [menu, setMenu] = useState(null);
  
  const dragCache = useRef(null);

  useEffect(() => {
    setNodes(activeBoard.nodes || []);
    setEdges(activeBoard.edges || []);
    setMenu(null);
  }, [activeBoardId]);

  useEffect(() => {
    setBoards(boards.map(b => b.id === activeBoardId ? { ...b, nodes, edges } : b));
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeDragStart = useCallback((event, node) => {
    const currentEdges = getEdges();
    const currentNodes = getNodes();

    const getDescendants = (parentId) => {
      let result = [];
      const childrenIds = currentEdges.filter(e => e.source === parentId).map(e => e.target);
      childrenIds.forEach(childId => {
        result.push(childId);
        result = result.concat(getDescendants(childId));
      });
      return result;
    };
    
    const descendantIds = getDescendants(node.id);
    const descendantPositions = {};
    descendantIds.forEach(id => {
      const n = currentNodes.find(nd => nd.id === id);
      if(n) descendantPositions[id] = { ...n.position };
    });

    dragCache.current = {
      startPos: { ...node.position },
      descendantPositions,
      descendantIds
    };
  }, [getNodes, getEdges]);

  const onNodeDrag = useCallback((event, node) => {
    if (!dragCache.current || dragCache.current.descendantIds.length === 0) return;
    const { startPos, descendantPositions, descendantIds } = dragCache.current;
    
    const dx = node.position.x - startPos.x;
    const dy = node.position.y - startPos.y;

    setNodes(nds => nds.map(n => {
      if (descendantIds.includes(n.id)) {
         return {
           ...n,
           position: {
             x: descendantPositions[n.id].x + dx,
             y: descendantPositions[n.id].y + dy
           }
         };
      }
      return n;
    }));
  }, [setNodes]);

  const onNodeDragStop = useCallback(() => {
    dragCache.current = null;
  }, []);

  const addNode = (type) => {
    const currentZs = nodes.map(n => n.zIndex || 0);
    const maxZ = currentZs.length > 0 ? Math.max(...currentZs) : 0;
    
    const newNode = {
      id: `node_${Date.now()}`,
      type: type,
      position: { x: 300 + Math.random() * 50, y: 300 + Math.random() * 50 },
      data: { label: 'Nouveau', text: '' },
      zIndex: maxZ + 1
    };
    if (type === 'rectangle') newNode.data.color = '#fef08a';
    setNodes((nds) => [...nds, newNode]);
  };

  const onMoveEnd = (event, viewport) => {
    setBoards(boards.map(b => b.id === activeBoardId ? { ...b, viewport } : b));
  };

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setMenu]
  );

  const onPaneClick = useCallback(() => {
    setMenu(null);
  }, [setMenu]);

  const bringToFront = () => {
    setNodes((nds) => {
      const currentZs = nds.map(n => n.zIndex || 0);
      const maxZ = currentZs.length > 0 ? Math.max(...currentZs) : 0;
      return nds.map(n => n.id === menu.id ? { ...n, zIndex: maxZ + 1 } : n);
    });
    setMenu(null);
  };

  const sendToBack = () => {
    setNodes((nds) => {
      const currentZs = nds.map(n => n.zIndex || 0);
      const minZ = currentZs.length > 0 ? Math.min(...currentZs) : 0;
      return nds.map(n => n.id === menu.id ? { ...n, zIndex: minZ - 1 } : n);
    });
    setMenu(null);
  };

  const arrangeChildren = () => {
    const rootId = menu.id;
    const rootNode = nodes.find(n => n.id === rootId);
    if (!rootNode) return setMenu(null);

    const getChildrenSubtree = (parentId) => {
      const childrenIds = edges.filter(e => e.source === parentId).map(e => e.target);
      let subtree = { id: parentId, children: [] };
      for (const childId of childrenIds) {
        subtree.children.push(getChildrenSubtree(childId));
      }
      return subtree;
    };

    const tree = getChildrenSubtree(rootId);
    if (tree.children.length === 0) return setMenu(null);

    const calculateSizes = (nodeTree) => {
      if (nodeTree.children.length === 0) {
        nodeTree.size = 1;
      } else {
        nodeTree.size = nodeTree.children.reduce((acc, child) => {
          calculateSizes(child);
          return acc + child.size;
        }, 0);
      }
    };
    calculateSizes(tree);

    const nodePositions = {};
    const X_OFFSET = 320;
    const Y_OFFSET = 100;

    const positionTree = (nodeTree, currentX, currentY) => {
      nodePositions[nodeTree.id] = { x: currentX, y: currentY };
      let startY = currentY - ((nodeTree.size - 1) * Y_OFFSET) / 2;

      for (const child of nodeTree.children) {
        const childY = startY + ((child.size - 1) * Y_OFFSET) / 2;
        positionTree(child, currentX + X_OFFSET, childY);
        startY += child.size * Y_OFFSET;
      }
    };

    positionTree(tree, rootNode.position.x, rootNode.position.y);

    setNodes((nds) => 
      nds.map(n => {
        if (nodePositions[n.id] && n.id !== rootId) {
          return { ...n, position: nodePositions[n.id] };
        }
        return n;
      })
    );
    setMenu(null);
  };

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView={true}
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        attributionPosition="bottom-right"
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#cbd5e1" gap={20} size={1.5} />
        <Controls />
        <MiniMap />
        
        <Panel position="top-left" className="toolbar-panel">
          <button className="toolbar-btn" onClick={() => addNode('custom')} title="Ajouter une idée structurée">
            <Plus size={18} />
          </button>
          <button className="toolbar-btn" onClick={() => addNode('rectangle')} title="Ajouter un post-it / rectangle">
            <Square size={18} />
          </button>
          <button className="toolbar-btn" onClick={() => addNode('text')} title="Ajouter un texte libre">
            <Type size={18} />
          </button>
        </Panel>
      </ReactFlow>

      {menu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: menu.top,
            left: menu.left,
          }}
          onMouseLeave={() => setMenu(null)}
        >
          <button onClick={arrangeChildren} className="context-menu-btn" style={{ fontWeight: '600', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', marginBottom: '4px', paddingBottom: '10px' }}>
            Ranger les enfants
          </button>
          <button onClick={bringToFront} className="context-menu-btn">
            Mettre au premier plan
          </button>
          <button onClick={sendToBack} className="context-menu-btn">
            Mettre en arrière-plan
          </button>
        </div>
      )}
    </>
  );
}

export default function MindMap() {
  const [boards, setBoards] = useState(() => {
    const saved = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    const oldSaved = localStorage.getItem('miro_clone_mindmap_state');
    if (oldSaved) {
        try { 
            const parsed = JSON.parse(oldSaved);
            return [{ id: 'board_1', name: 'Ancienne Carte', nodes: parsed.nodes, edges: parsed.edges, viewport: {x:0, y:0, zoom:1} }];
        } catch(e) {}
    }

    return [{ id: 'board_1', name: 'Carte Principale', nodes: defaultNodes, edges: defaultEdges, viewport: {x:0, y:0, zoom:1} }];
  });
  
  const [activeBoardId, setActiveBoardId] = useState(boards[0]?.id);

  useEffect(() => {
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
  }, [boards]);

  const addBoard = () => {
    const newBoard = {
      id: `board_${Date.now()}`,
      name: `Nouvelle Carte ${boards.length + 1}`,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    };
    setBoards([...boards, newBoard]);
    setActiveBoardId(newBoard.id);
  };

  const removeBoard = (id, e) => {
    e.stopPropagation();
    if(boards.length === 1) {
      alert("Impossible de supprimer la dernière carte.");
      return;
    }
    if (window.confirm("Supprimer cette carte ?")) {
      const newBoards = boards.filter(b => b.id !== id);
      setBoards(newBoards);
      if (activeBoardId === id) setActiveBoardId(newBoards[0].id);
    }
  };

  const renameBoard = (id, newName) => {
    setBoards(boards.map(b => b.id === id ? { ...b, name: newName } : b));
  };

  return (
    <div className="mindmap-container-wrapper">
      <div className="boards-tabs">
        {boards.map(b => (
          <div 
            key={b.id} 
            className={`board-tab ${activeBoardId === b.id ? 'active' : ''}`}
            onClick={() => setActiveBoardId(b.id)}
          >
            <input 
              value={b.name} 
              onChange={(e) => renameBoard(b.id, e.target.value)}
              className="board-tab-input"
            />
            {boards.length > 1 && (
              <button className="close-tab-btn" onClick={(e) => removeBoard(b.id, e)}>×</button>
            )}
          </div>
        ))}
        <button className="add-board-btn" onClick={addBoard} title="Nouvelle Carte">
          <Plus size={16} />
        </button>
      </div>

      <div className="reactflow-wrapper">
        <ReactFlowProvider key={activeBoardId}>
          <MindMapCanvas activeBoardId={activeBoardId} boards={boards} setBoards={setBoards} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
