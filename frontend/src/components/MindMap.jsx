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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import RectangleNode from './RectangleNode';
import TextNode from './TextNode';
import { api } from '../api';
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

function SortableBoardTab({ board, activeBoardId, setActiveBoardId, renameBoard, removeBoard, isOnlyBoard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: board.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : 1,
    position: 'relative',
    touchAction: 'none'
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`board-tab ${activeBoardId === board.id ? 'active' : ''}`}
      onClick={() => setActiveBoardId(board.id)}
    >
      <input 
        value={board.name} 
        onChange={(e) => renameBoard(board.id, e.target.value)}
        className="board-tab-input"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      />
      {!isOnlyBoard && (
        <button 
          className="close-tab-btn" 
          onClick={(e) => { e.stopPropagation(); removeBoard(board.id, e); }}
          onPointerDown={(e) => e.stopPropagation()}
        >×</button>
      )}
    </div>
  );
}

function MindMapCanvas({ activeBoardId, boards, setBoards }) {
  const { getNodes, getEdges } = useReactFlow();

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0] || {};
  const [nodes, setNodes] = useState(activeBoard.nodes || defaultNodes);
  const [edges, setEdges] = useState(activeBoard.edges || defaultEdges);
  const [menu, setMenu] = useState(null);
  
  const dragCache = useRef(null);

  // Unnecessary useEffect loop removed - Canvas mounts and unmounts cleanly with ReactFlowProvider keys.

  // Debounced Save to Backend
  useEffect(() => {
    setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, nodes, edges } : b));
    
    if (activeBoardId) {
       const timer = setTimeout(() => {
          // Only push the updated nodes and edges, Prisma will safely ignore undefined fields (name/viewport)
          api.updateBoard(activeBoardId, { nodes, edges }).catch(console.error);
       }, 1500); // Debouncer
       return () => clearTimeout(timer);
    }
  }, [nodes, edges, activeBoardId]);

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

    const getChildrenSubtree = (parentId, inheritedDirection) => {
      const childEdges = edges.filter(e => e.source === parentId);
      let children = [];
      for (const edge of childEdges) {
        let dir = inheritedDirection || (edge.sourceHandle === 'source-left' ? 'left' : 'right');
        children.push({
           id: edge.target,
           direction: dir,
           children: getChildrenSubtree(edge.target, dir)
        });
      }
      return children;
    };

    const rootChildren = getChildrenSubtree(rootId, null);
    if (rootChildren.length === 0) return setMenu(null);

    const calculateSizes = (childrenArray) => {
      let totalSize = 0;
      for (const child of childrenArray) {
        if (child.children.length === 0) {
          child.size = 1;
        } else {
          child.size = calculateSizes(child.children);
        }
        totalSize += child.size;
      }
      return totalSize;
    };

    const leftChildren = rootChildren.filter(c => c.direction === 'left');
    const rightChildren = rootChildren.filter(c => c.direction === 'right');

    const leftSize = calculateSizes(leftChildren);
    const rightSize = calculateSizes(rightChildren);

    const nodePositions = {};
    const X_OFFSET = 320;
    const Y_OFFSET = 100;

    const positionChildren = (childrenArray, parentX, parentY, isLeft) => {
      const totalSize = childrenArray.reduce((sum, c) => sum + c.size, 0);
      let startY = parentY - ((totalSize - 1) * Y_OFFSET) / 2;

      for (const child of childrenArray) {
        const childY = startY + ((child.size - 1) * Y_OFFSET) / 2;
        const childX = parentX + (isLeft ? -X_OFFSET : X_OFFSET);
        nodePositions[child.id] = { x: childX, y: childY };
        
        positionChildren(child.children, childX, childY, isLeft);
        
        startY += child.size * Y_OFFSET;
      }
    };

    positionChildren(leftChildren, rootNode.position.x, rootNode.position.y, true);
    positionChildren(rightChildren, rootNode.position.x, rootNode.position.y, false);

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
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedBoards = await api.getBoards();
        if (fetchedBoards.length === 0) {
          const newBoard = await api.createBoard({ 
            name: 'Carte Principale', 
            nodes: defaultNodes, 
            edges: defaultEdges, 
            viewport: {x:0, y:0, zoom:1} 
          });
          setBoards([newBoard]);
          setActiveBoardId(newBoard.id);
        } else {
          setBoards(fetchedBoards);
          setActiveBoardId(fetchedBoards[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    let newOrderIds = [];
    setBoards((prevBoards) => {
      const oldIndex = prevBoards.findIndex(b => b.id === active.id);
      const newIndex = prevBoards.findIndex(b => b.id === over.id);
      
      const newBoards = [...prevBoards];
      const [moved] = newBoards.splice(oldIndex, 1);
      newBoards.splice(newIndex, 0, moved);
      
      newOrderIds = newBoards.map(b => b.id);
      return newBoards;
    });

    if (newOrderIds.length > 0) {
      await api.reorderBoards(newOrderIds).catch(console.error);
    }
  };

  const addBoard = async () => {
    const newBoard = await api.createBoard({ 
      name: `Nouvelle Carte ${boards.length + 1}`,
      nodes: [],
      edges: [],
      viewport: {x:0, y:0, zoom:1},
      orderIndex: boards.length
    }).catch(console.error);
    
    if (newBoard) {
      setBoards([...boards, newBoard]);
      setActiveBoardId(newBoard.id);
    }
  };

  const removeBoard = async (id, e) => {
    e.stopPropagation();
    if(boards.length === 1) {
      alert("Impossible de supprimer la dernière carte.");
      return;
    }
    if (window.confirm("Supprimer cette carte ?")) {
      const newBoards = boards.filter(b => b.id !== id);
      setBoards(newBoards);
      if (activeBoardId === id) setActiveBoardId(newBoards[0].id);
      await api.deleteBoard(id).catch(console.error);
    }
  };

  const renameBoard = async (id, newName) => {
    setBoards(boards.map(b => b.id === id ? { ...b, name: newName } : b));
    const board = boards.find(b => b.id === id);
    if(board) {
      await api.updateBoard(id, { ...board, name: newName }).catch(console.error);
    }
  };

  if (loading || !activeBoardId) {
    return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#64748b' }}>Chargement de l'espace de travail...</div>;
  }

  return (
    <div className="mindmap-container-wrapper">
      <div className="boards-tabs">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={boards.map(b => b.id)} strategy={horizontalListSortingStrategy}>
            {boards.map(b => (
              <SortableBoardTab 
                key={b.id} 
                board={b} 
                activeBoardId={activeBoardId} 
                setActiveBoardId={setActiveBoardId} 
                renameBoard={renameBoard} 
                removeBoard={removeBoard} 
                isOnlyBoard={boards.length <= 1}
              />
            ))}
          </SortableContext>
        </DndContext>
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
