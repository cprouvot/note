import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  ReactFlowProvider,
  useReactFlow,
  getRectOfNodes
} from 'reactflow';
import { Plus, Square, Type, Map as MapIcon, Camera, Image as ImageIcon, Cloud, CloudUpload, CloudOff, CheckCircle2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import RectangleNode from './RectangleNode';
import TextNode from './TextNode';
import ImageNode from './ImageNode';
import { api, syncEmitter, retryFailedMutations, schedulePendingSave, flushPendingSave, cancelPendingSave } from '../api';
import { serializeBoardContent } from './boardSync';
import { socket } from '../socket';
import { computeTreeLayout, applyPositions, findTreeRoot, getNewChildPosition, getDescendantIds, COLLAPSE_KEYS } from './mindmapLayout';
import './MindMap.css';

const nodeTypes = {
  custom: CustomNode,
  rectangle: RectangleNode,
  text: TextNode,
  image: ImageNode
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
  const { getNodes, getEdges, getIntersectingNodes } = useReactFlow();

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0] || {};
  const [nodes, setNodes] = useState(activeBoard.nodes || defaultNodes);
  const [edges, setEdges] = useState(activeBoard.edges || defaultEdges);
  const [menu, setMenu] = useState(null);
  // Rangements différés : rootId -> id d'un nœud à attendre (mesure React Flow) ou null
  const pendingLayouts = useRef(new Map());
  // Nœuds modifiés dans cet onglet : seuls leurs changements de taille déclenchent un rangement
  // (évite des boucles de synchro entre navigateurs qui mesurent des tailles légèrement différentes)
  const locallyEditedIds = useRef(new Set());
  const scheduleLayout = (rootId, waitForNodeId = null) => {
    if (!pendingLayouts.current.get(rootId)) pendingLayouts.current.set(rootId, waitForNodeId);
  };
  const [syncState, setSyncState] = useState('saved');
  const [syncError, setSyncError] = useState(null);
  // Nœud à passer en édition dès son apparition (création via Tab ou bouton +)
  const [autoEditNodeId, setAutoEditNodeId] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(() => {
    const saved = localStorage.getItem('mindboard_minimap');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const clipboardRef = useRef([]);
  const isUndoRedoAction = useRef(false);
  // Suppression en cascade en cours : les liens sont retirés par nos soins, pas par React Flow
  const isCascadeDelete = useRef(false);

  // Évite de renvoyer au serveur une carte qui en provient (chargement ou mise à jour d'un autre onglet),
  // sinon deux onglets ouverts sur la même carte se la renvoient indéfiniment.
  const [initialContent] = useState(() => serializeBoardContent(nodes, edges));
  const lastSyncedContent = useRef(initialContent); // dernier contenu connu du serveur
  const appliedFromServer = useRef({ nodes, edges }); // tableaux tels que reçus du serveur

  // Synchronisation distante Socket.io
  useEffect(() => {
    if (activeBoardId) {
      socket.emit('join_board', activeBoardId);
    }

    const handleRemoteUpdate = async () => {
      try {
        const remoteBoard = await api.getBoard(activeBoardId);
        if (remoteBoard && remoteBoard.nodes) {
          const remoteEdges = remoteBoard.edges || [];
          lastSyncedContent.current = serializeBoardContent(remoteBoard.nodes, remoteEdges);
          appliedFromServer.current = { nodes: remoteBoard.nodes, edges: remoteEdges };
          setNodes(remoteBoard.nodes);
          setEdges(remoteEdges);
          // Mettre également à jour le nom si on a un hook global, 
          // mais on fait simple pour les nodes pour éviter les loops de setBoards.
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    };

    socket.on('server:board_updated', handleRemoteUpdate);
    
    return () => {
      socket.off('server:board_updated', handleRemoteUpdate);
      if (activeBoardId) {
        socket.emit('leave_board', activeBoardId);
      }
    };
  }, [activeBoardId]);

  const takeSnapshot = useCallback(() => {
    setPast(p => {
      const newPast = [...p, { nodes: getNodes(), edges: getEdges() }];
      if (newPast.length > 50) newPast.shift();
      return newPast;
    });
    setFuture([]);
  }, [getNodes, getEdges]);

  const undo = useCallback(() => {
    setPast(p => {
      if (p.length === 0) return p;
      const newPast = [...p];
      const previousState = newPast.pop();
      setFuture(f => [{ nodes: getNodes(), edges: getEdges() }, ...f]);
      
      isUndoRedoAction.current = true;
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setTimeout(() => { isUndoRedoAction.current = false; }, 50);
      return newPast;
    });
  }, [getNodes, getEdges, setNodes, setEdges]);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const newFuture = [...f];
      const nextState = newFuture.shift();
      setPast(p => {
         const newPast = [...p, { nodes: getNodes(), edges: getEdges() }];
         if (newPast.length > 50) newPast.shift();
         return newPast;
      });
      
      isUndoRedoAction.current = true;
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setTimeout(() => { isUndoRedoAction.current = false; }, 50);
      return newFuture;
    });
  }, [getNodes, getEdges, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === 'c') {
         const selectedNodes = getNodes().filter(n => n.selected);
         if (selectedNodes.length > 0) clipboardRef.current = selectedNodes;
      } else if (modKey && e.key.toLowerCase() === 'v') {
         if (clipboardRef.current.length > 0) {
            takeSnapshot();
            const newNodes = clipboardRef.current.map((n, i) => {
               const clonedData = JSON.parse(JSON.stringify(n.data));
               return {
                 ...n,
                 id: `node_copy_${Date.now()}_${i}`,
                 selected: true,
                 data: clonedData,
                 position: { x: n.position.x + 50, y: n.position.y + 50 }
               };
            });
            setNodes(nds => [...nds.map(n => ({...n, selected: false})), ...newNodes]);
         }
      } else if (modKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
         e.preventDefault(); undo();
      } else if (modKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
         e.preventDefault(); redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getNodes, setNodes, takeSnapshot, undo, redo]);

  useEffect(() => {
    const handleSync = (e) => {
      setSyncState(e.detail.status);
      setSyncError(e.detail.error || null);
    };
    syncEmitter.addEventListener('sync', handleSync);
    return () => syncEmitter.removeEventListener('sync', handleSync);
  }, []);

  useEffect(() => {
    localStorage.setItem('mindboard_minimap', JSON.stringify(showMiniMap));
  }, [showMiniMap]);
  
  const dragCache = useRef(null);
  const fileInputRef = useRef(null);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
               height *= MAX_WIDTH / width;
               width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
               width *= MAX_HEIGHT / height;
               height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // WebP has great compression ratio
          const dataUrl = canvas.toDataURL('image/webp', 0.85); 
          resolve({ dataUrl, width, height });
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (file, flowPosition = null) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const { dataUrl, width, height } = await compressImage(file);
      takeSnapshot();
      
      const currentZs = nodes.map(n => n.zIndex || 0);
      const maxZ = currentZs.length > 0 ? Math.max(...currentZs) : 0;
      
      const defaultCenter = { x: 300, y: 300 }; // Fallback if no specific drop position

      const newNode = {
         id: `node_img_${Date.now()}`,
         type: 'image',
         position: flowPosition || defaultCenter,
         data: { src: dataUrl },
         zIndex: maxZ + 1,
         style: { 
           width: Math.min(width, 400), 
           height: Math.min(height, 400 * height / width) 
         }
      };
      
      setNodes(nds => [...nds.map(n => ({...n, selected: false})), { ...newNode, selected: true }]);
    } catch (err) {
      console.error("Erreur d'import d'image", err);
    }
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    // Reset input
    e.target.value = null;
  };

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      handleImageUpload(file, position);
    }
  }, [screenToFlowPosition, nodes]);

  // Debounced Save to Backend
  useEffect(() => {
    setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, nodes, edges } : b));
    
    if (!activeBoardId) return;
    const saveKey = `board:${activeBoardId}`;

    // État tel que reçu du serveur : rien à renvoyer (et une éventuelle sauvegarde locale en attente est caduque)
    if (nodes === appliedFromServer.current.nodes && edges === appliedFromServer.current.edges) {
      cancelPendingSave(saveKey);
      setSyncState(state => state === 'pending' ? 'saved' : state);
      return;
    }

    setSyncState('pending');
    schedulePendingSave(saveKey, () => {
      // Contenu identique à la version serveur (mesures, sélection, annulation...) : pas d'envoi
      const content = serializeBoardContent(nodes, edges);
      if (content === lastSyncedContent.current) {
        setSyncState(state => state === 'pending' ? 'saved' : state);
        return;
      }
      api.updateBoard(activeBoardId, { nodes, edges })
        .then(result => { if (result?.success) lastSyncedContent.current = content; })
        .catch(console.error);
    });
    const timer = setTimeout(() => flushPendingSave(saveKey), 1500); // Debouncer
    return () => clearTimeout(timer);
  }, [nodes, edges, activeBoardId]);

  // Changement de carte ou démontage : envoyer la dernière sauvegarde au lieu de l'abandonner
  useEffect(() => {
    return () => flushPendingSave(`board:${activeBoardId}`);
  }, [activeBoardId]);

  const onDownload = async () => {
    if (nodes.length === 0) return;
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;

    try {
      const nodesBounds = getRectOfNodes(nodes);
      const padding = 100;
      const imageWidth = nodesBounds.width + padding * 2;
      const imageHeight = nodesBounds.height + padding * 2;
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
      
      const dataUrl = await toPng(viewport, {
        backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: imageWidth + 'px',
          height: imageHeight + 'px',
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px) scale(1)`,
        },
      });

      const link = document.createElement('a');
      link.download = `mindboard-export-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erreur lors de l'export PNG", err);
    }
  };

  const onNodesChange = useCallback(
    (changes) => {
      const removedIds = changes.filter(c => c.type === 'remove').map(c => c.id);
      if (!isUndoRedoAction.current && removedIds.length > 0) takeSnapshot();

      // Supprimer une idée supprime aussi tout ce qui en dépend (enfants, petits-enfants...)
      if (removedIds.length > 0) {
        const currentEdges = getEdges();
        const deletedIds = new Set(removedIds.flatMap(id => [id, ...getDescendantIds(id, currentEdges)]));
        const remainingEdges = currentEdges.filter(e => !deletedIds.has(e.source) && !deletedIds.has(e.target));

        isCascadeDelete.current = true;
        setTimeout(() => { isCascadeDelete.current = false; }, 0);
        setEdges(remainingEdges);
        setNodes(nds => applyNodeChanges(changes.filter(c => c.type !== 'remove'), nds)
          .filter(n => !deletedIds.has(n.id)));

        // Ranger les arbres amputés pour refermer l'espace laissé par la branche supprimée
        const orphanedParents = new Set(currentEdges
          .filter(e => deletedIds.has(e.target) && !deletedIds.has(e.source))
          .map(e => e.source));
        for (const parentId of orphanedParents) scheduleLayout(findTreeRoot(parentId, remainingEdges));
        return;
      }

      setNodes((nds) => {
        // Une idée éditée localement et déjà mesurée qui change de taille : ranger son arbre.
        // La première mesure (chargement, nouvel enfant) est ignorée pour ne pas écraser les positions.
        const currentEdges = getEdges();
        for (const change of changes) {
          if (change.type !== 'dimensions' || !change.dimensions) continue;
          if (!locallyEditedIds.current.delete(change.id)) continue;
          const prev = nds.find(n => n.id === change.id);
          if (prev?.type !== 'custom' || !prev.width || !prev.height) continue;
          const resized = Math.abs(prev.width - change.dimensions.width) > 1
            || Math.abs(prev.height - change.dimensions.height) > 1;
          if (resized && currentEdges.some(e => e.source === change.id || e.target === change.id)) {
            scheduleLayout(findTreeRoot(change.id, currentEdges));
          }
        }
        return applyNodeChanges(changes, nds);
      });
    },
    [setNodes, setEdges, takeSnapshot, getEdges]
  );
  const onEdgesChange = useCallback(
    (changes) => {
      // Pendant une cascade, les liens sont déjà retirés : pas de second point d'annulation
      if (!isUndoRedoAction.current && !isCascadeDelete.current && changes.some(c => c.type === 'remove')) takeSnapshot();
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges, takeSnapshot]
  );
  const onConnect = useCallback(
    (connection) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ ...connection, animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds));
    },
    [setEdges, takeSnapshot]
  );

  const onNodeDragStart = useCallback((event, node) => {
    takeSnapshot();
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
    let hoverTargetId = null;
    const intersections = getIntersectingNodes(node).filter(n => n.id !== node.id && n.type === 'custom' && node.type === 'custom');
    
    if (intersections.length > 0) {
      const target = intersections[0];
      const descendants = dragCache.current ? dragCache.current.descendantIds : [];
      if (!descendants.includes(target.id) && target.id !== node.id) {
         hoverTargetId = target.id;
      }
    }

    setNodes(nds => nds.map(n => {
      let nextNode = n;

      if (dragCache.current && dragCache.current.descendantIds.includes(n.id)) {
        const { startPos, descendantPositions } = dragCache.current;
        const dx = node.position.x - startPos.x;
        const dy = node.position.y - startPos.y;
        nextNode = {
          ...nextNode,
          position: {
            x: descendantPositions[n.id].x + dx,
            y: descendantPositions[n.id].y + dy
          }
        };
      }

      const isHovered = n.id === hoverTargetId;
      if (isHovered) {
        if (!nextNode.className || !nextNode.className.includes('drop-target-hover')) {
          nextNode = { ...nextNode, className: `${nextNode.className || ''} drop-target-hover`.trim() };
        }
      } else {
        if (nextNode.className && nextNode.className.includes('drop-target-hover')) {
           nextNode = { ...nextNode, className: nextNode.className.replace('drop-target-hover', '').trim() };
        }
      }

      return nextNode;
    }));
  }, [setNodes, getIntersectingNodes]);

  const onNodeDragStop = useCallback((event, node) => {
    let dx = 0, dy = 0;
    let dragStartPos = { x: node.position.x, y: node.position.y };
    let descendants = [], startPositions = {};
    if (dragCache.current) {
      const { startPos, descendantPositions, descendantIds } = dragCache.current;
      dragStartPos = startPos;
      dx = node.position.x - startPos.x;
      dy = node.position.y - startPos.y;
      descendants = descendantIds || [];
      startPositions = descendantPositions || {};
    }
    dragCache.current = null;

    const intersections = getIntersectingNodes(node).filter(n => n.id !== node.id && n.type === 'custom' && node.type === 'custom');
    let newParent = null;

    const currentEdges = getEdges();
    if (intersections.length > 0) {
      const target = intersections[0];
      const getAllDescendants = (parentId) => {
        let result = [];
        const childrenIds = currentEdges.filter(e => e.source === parentId).map(e => e.target);
        childrenIds.forEach(childId => {
          result.push(childId);
          result = result.concat(getAllDescendants(childId));
        });
        return result;
      };
      
      const allDescendants = getAllDescendants(node.id);
      if (!allDescendants.includes(target.id) && target.id !== node.id) {
        newParent = target;
      }
    }

    let finalNodePos = { x: node.position.x, y: node.position.y };

    if (newParent) {
      const isLeft = node.position.x < newParent.position.x;
      
      const sideEdges = currentEdges.filter(e => e.source === newParent.id && (isLeft ? e.sourceHandle === 'source-left' : e.sourceHandle !== 'source-left'));
      const sideNodes = getNodes().filter(n => sideEdges.some(edge => edge.target === n.id) && n.id !== node.id);
      
      let newY = newParent.position.y;
      if (sideNodes.length > 0) {
        newY = Math.max(...sideNodes.map(n => n.position.y)) + 60;
      }
      
      finalNodePos = { x: newParent.position.x + (isLeft ? -220 : 220), y: newY };
      dx = finalNodePos.x - dragStartPos.x;
      dy = finalNodePos.y - dragStartPos.y;
      
      const newEdge = {
        id: `edge_${newParent.id}_${node.id}_${Date.now()}`,
        source: newParent.id,
        target: node.id,
        sourceHandle: isLeft ? 'source-left' : null,
        targetHandle: isLeft ? 'target-right' : null,
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 }
      };
      const nextEdges = [...currentEdges.filter(e => e.target !== node.id), newEdge];
      setEdges(nextEdges);

      // Rangement de l'arbre d'accueil au prochain rendu
      scheduleLayout(findTreeRoot(newParent.id, nextEdges));
    }

    setNodes(nds => nds.map(n => {
       let updatedNode = n;
       if (n.id === node.id) {
         updatedNode = { ...updatedNode, position: finalNodePos };
       } else if (descendants.includes(n.id)) {
         updatedNode = { 
           ...updatedNode, 
           position: { x: startPositions[n.id].x + dx, y: startPositions[n.id].y + dy }
         };
       }
       if (updatedNode.className && updatedNode.className.includes('drop-target-hover')) {
          updatedNode = { ...updatedNode, className: updatedNode.className.replace('drop-target-hover', '').trim() };
       }
       return updatedNode;
    }));
  }, [getIntersectingNodes, getEdges, setEdges, getNodes, setNodes]);

  const addNode = (type) => {
    takeSnapshot();
    const currentZs = nodes.map(n => n.zIndex || 0);
    const maxZ = currentZs.length > 0 ? Math.max(...currentZs) : 0;
    
    const centerPosition = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });
    
    const newNode = {
      id: `node_${Date.now()}`,
      type: type,
      position: { 
        x: centerPosition.x + (Math.random() * 50 - 25), 
        y: centerPosition.y + (Math.random() * 50 - 25) 
      },
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
    takeSnapshot();
    setNodes((nds) => {
      const currentZs = nds.map(n => n.zIndex || 0);
      const maxZ = currentZs.length > 0 ? Math.max(...currentZs) : 0;
      return nds.map(n => n.id === menu.id ? { ...n, zIndex: maxZ + 1 } : n);
    });
    setMenu(null);
  };

  const sendToBack = () => {
    takeSnapshot();
    setNodes((nds) => {
      const currentZs = nds.map(n => n.zIndex || 0);
      const minZ = currentZs.length > 0 ? Math.min(...currentZs) : 0;
      return nds.map(n => n.id === menu.id ? { ...n, zIndex: minZ - 1 } : n);
    });
    setMenu(null);
  };

  // "Ranger les enfants" depuis le menu contextuel : le nœud cliqué sert de racine fixe
  const arrangeChildren = useCallback(() => {
    if (!menu) return;
    const positions = computeTreeLayout(nodes, edges, menu.id);
    if (Object.keys(positions).length > 0) {
      takeSnapshot();
      setNodes(nds => applyPositions(nds, positions));
    }
    setMenu(null);
  }, [nodes, edges, menu, takeSnapshot]);

  // Ajout d'un enfant (boutons + / Tab) : insertion puis rangement de tout l'arbre concerné
  const addChildNode = useCallback((parentId, direction = 'right') => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const parentNode = currentNodes.find(n => n.id === parentId);
    if (!parentNode) return;

    takeSnapshot();
    const isLeft = direction === 'left';
    const newNodeId = `node_${Math.random().toString(36).substr(2, 9)}`;
    const newNode = {
      id: newNodeId,
      type: 'custom',
      position: getNewChildPosition(parentNode, currentNodes, currentEdges, isLeft),
      data: { label: 'Nouvelle idée' },
      selected: true,
    };
    const newEdge = {
      id: `edge_${parentId}_${newNodeId}`,
      source: parentId,
      target: newNodeId,
      sourceHandle: isLeft ? 'source-left' : null,
      targetHandle: isLeft ? 'target-right' : null,
      animated: false,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    };
    const nextEdges = [...currentEdges, newEdge];

    // Déplier le côté concerné pour que le nouvel enfant soit visible
    const collapseKey = isLeft ? 'collapsedLeft' : 'collapsedRight';
    setNodes(nds => [
      ...nds.map(n => {
        const deselected = { ...n, selected: false };
        return n.id === parentId && (n.data?.[collapseKey] || (!isLeft && n.data?.collapsed))
          ? { ...deselected, data: { ...n.data, [collapseKey]: false, ...(isLeft ? {} : { collapsed: false }) } }
          : deselected;
      }),
      newNode
    ]);
    setEdges(nextEdges);
    pendingLayouts.current.set(findTreeRoot(parentId, nextEdges), newNodeId);
    setAutoEditNodeId(newNodeId);
  }, [getNodes, getEdges, takeSnapshot]);

  // Exécute les rangements en attente une fois les nœuds attendus mesurés (largeur/hauteur réelles)
  useEffect(() => {
    if (pendingLayouts.current.size === 0) return;

    let laidOutNodes = nodes;
    for (const [rootId, waitForId] of pendingLayouts.current) {
      const target = waitForId && nodes.find(n => n.id === waitForId);
      if (target && (!target.width || !target.height)) continue;

      pendingLayouts.current.delete(rootId);
      laidOutNodes = applyPositions(laidOutNodes, computeTreeLayout(laidOutNodes, edges, rootId));
    }
    if (laidOutNodes !== nodes) setNodes(laidOutNodes);
  }, [nodes, edges]);

  const clearAutoEdit = useCallback(() => setAutoEditNodeId(null), []);

  const updateNodeData = useCallback((id, newData) => {
    locallyEditedIds.current.add(id);
    // Repli / dépli d'une branche : ranger l'arbre pour libérer ou réserver la place des enfants
    if (COLLAPSE_KEYS.some(key => key in newData)) {
      const currentEdges = getEdges();
      if (currentEdges.some(e => e.source === id)) scheduleLayout(findTreeRoot(id, currentEdges));
    }
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n));
  }, [setNodes, getEdges]);

  const { visibleNodes, visibleEdges } = useMemo(() => {
    const hiddenNodes = new Set();
    const hiddenEdges = new Set();
    
    const parentLeftIds = new Set(edges.filter(e => e.sourceHandle === 'source-left').map(e => e.source));
    const parentRightIds = new Set(edges.filter(e => e.sourceHandle !== 'source-left').map(e => e.source));
    
    // Déterminer le côté absolu du noeud (pour affecter tab/shift+tab)
    const sideMap = new Map();
    const targetIds = new Set(edges.map(e => e.target));
    const rootNodes = nodes.filter(n => !targetIds.has(n.id));
    
    const assignSide = (parentId, inheritedSide) => {
       const childEdges = edges.filter(e => e.source === parentId);
       for (const edge of childEdges) {
          const childSide = inheritedSide || (edge.sourceHandle === 'source-left' ? 'left' : 'right');
          sideMap.set(edge.target, childSide);
          assignSide(edge.target, childSide);
       }
    };
    
    for (const root of rootNodes) {
       sideMap.set(root.id, 'root');
       assignSide(root.id, null);
    }
    
    const hideDescendants = (parentId, side) => {
      const childEdges = edges.filter(e => e.source === parentId && 
        (side === 'left' ? e.sourceHandle === 'source-left' : e.sourceHandle !== 'source-left')
      );
      for (const edge of childEdges) {
        hiddenEdges.add(edge.id);
        hiddenNodes.add(edge.target);
        hideDescendants(edge.target, 'left');
        hideDescendants(edge.target, 'right');
      }
    };
    
    for (const n of nodes) {
      if (n.data?.collapsedLeft) hideDescendants(n.id, 'left');
      if (n.data?.collapsedRight || n.data?.collapsed) hideDescendants(n.id, 'right');
    }
    
    return {
      visibleNodes: nodes.map(n => ({ 
        ...n, 
        hidden: hiddenNodes.has(n.id),
        data: {
          ...n.data,
          hasLeftChildren: parentLeftIds.has(n.id),
          hasRightChildren: parentRightIds.has(n.id),
          side: sideMap.get(n.id) || 'root',
          updateNodeData,
          addChildNode,
          autoEdit: n.id === autoEditNodeId,
          clearAutoEdit
        }
      })),
      visibleEdges: edges.map(e => ({ ...e, hidden: hiddenEdges.has(e.id), animated: false }))
    };
  }, [nodes, edges, updateNodeData, addChildNode, autoEditNodeId, clearAutoEdit]);

  return (
    <>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView={true}
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        minZoom={0.1}
        attributionPosition="bottom-right"
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <div
          role={syncState === 'error' ? 'button' : 'status'}
          aria-live="polite"
          aria-label={syncState === 'error' ? `Échec de l'enregistrement : ${syncError}. Cliquer pour réessayer` : undefined}
          onClick={syncState === 'error' ? retryFailedMutations : undefined}
          style={{
          position: 'absolute',
          bottom: '24px',
          left: '64px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: syncState === 'saved' ? '#10b981' : syncState === 'error' ? '#ef4444' : 'var(--text-muted)',
          background: 'var(--panel-bg)',
          padding: '10px',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-md)',
          border: `1px solid ${syncState === 'error' ? '#ef4444' : 'var(--border-color)'}`,
          cursor: syncState === 'error' ? 'pointer' : 'default',
          transition: 'color 0.3s'
        }} title={
          syncState === 'syncing' ? 'Sauvegarde...'
          : syncState === 'pending' ? 'Modifications...'
          : syncState === 'error' ? `Non enregistré : ${syncError}\nCliquer pour réessayer`
          : 'Enregistré à l\'instant'
        }>
           {syncState === 'syncing' && <CloudUpload size={18} className="spin-icon" style={{ animation: 'spin 2s linear infinite' }} />}
           {syncState === 'pending' && <Cloud size={18} />}
           {syncState === 'error' && <CloudOff size={18} />}
           {syncState === 'saved' && <CheckCircle2 size={18} />}
        </div>

        <Background color="#cbd5e1" gap={20} size={1.5} />
        <Controls />
        {showMiniMap && <MiniMap pannable zoomable />}
        
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
          
          <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()} title="Ajouter une image">
            <ImageIcon size={18} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onFileInputChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          
          <button className="toolbar-btn" onClick={onDownload} title="Exporter la carte en Image (PNG)">
            <Camera size={18} />
          </button>
          
          <button 
            className="toolbar-btn" 
            onClick={() => setShowMiniMap(!showMiniMap)} 
            title={showMiniMap ? "Masquer la Mini-Map" : "Afficher la Mini-Map"}
            style={{ color: showMiniMap ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            <MapIcon size={18} />
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
