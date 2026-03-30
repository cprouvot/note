import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Plus, Minus, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

export default function CustomNode({ id, data, selected }) {
  const [label, setLabel] = useState(data.label);
  const [bgColor, setBgColor] = useState(data.bgColor || '#ffffff');
  const [textColor, setTextColor] = useState(data.textColor || '#0f172a');
  const [showBgPalette, setShowBgPalette] = useState(false);
  const [showTextPalette, setShowTextPalette] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { setNodes, setEdges, getNodes, getEdges, deleteElements } = useReactFlow();

  useEffect(() => {
    if (!selected && isEditing) setIsEditing(false);
  }, [selected, isEditing]);

  const onDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const onChange = (html) => {
     setLabel(html);
     updateNodeData({ label: html });
  };

  const updateNodeData = (newData) => {
    if (data.updateNodeData) {
      data.updateNodeData(id, newData);
    } else {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, ...newData } };
          }
          return node;
        })
      );
    }
  };

  const onDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const onBgColorChange = (evt) => {
    const val = evt.target.value;
    setBgColor(val);
    updateNodeData({ bgColor: val });
  };

  const onTextColorChange = (evt) => {
    const val = evt.target.value;
    setTextColor(val);
    updateNodeData({ textColor: val });
  };

  const onAddChild = (evt, direction = 'right') => {
    if(evt) evt.stopPropagation();
    const nodes = getNodes();
    const edges = getEdges();
    const parentNode = nodes.find(n => n.id === id);
    if (!parentNode) return;

    const newNodeId = `node_${Math.random().toString(36).substr(2, 9)}`;
    const isLeft = direction === 'left';

    // Calculate vertical offset relative to existing children on the SAME side
    const sideChildrenEdges = edges.filter(e => e.source === id && (isLeft ? e.sourceHandle === 'source-left' : e.sourceHandle !== 'source-left'));
    const sideChildrenNodes = nodes.filter(n => sideChildrenEdges.some(edge => edge.target === n.id));
    
    let newY = parentNode.position.y;
    if (sideChildrenNodes.length > 0) {
      const maxY = Math.max(...sideChildrenNodes.map(n => n.position.y));
      newY = maxY + 80;
    }
    
    const newNode = {
      id: newNodeId,
      type: 'custom',
      position: { 
        x: parentNode.position.x + (isLeft ? -280 : 280), 
        y: newY 
      },
      data: { label: 'Nouvelle idée' },
    };

    const newEdge = {
      id: `edge_${id}_${newNodeId}`,
      source: id,
      target: newNodeId,
      sourceHandle: isLeft ? 'source-left' : null,
      targetHandle: isLeft ? 'target-right' : null,
      animated: false,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    };

    setNodes((nds) => {
      const resetNodes = nds.map(n => ({ ...n, selected: false }));
      return [...resetNodes, { ...newNode, selected: true }];
    });
    setEdges((eds) => [...eds, newEdge]);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (evt) => {
      // Prevent Tab event firing globally if they are typing inside the rich text editor of this node
      // Wait, we WANT tab to create a child even when they are focused!
      if (evt.key === 'Tab' && selected) {
        evt.preventDefault();
        const nodeSide = data.side || 'root';
        let direction = nodeSide === 'left' ? 'left' : 'right';
        
        if (evt.shiftKey) {
           direction = direction === 'left' ? 'right' : 'left';
        }
        onAddChild(evt, direction);
      }
    };
    
    if (selected) {
      window.addEventListener('keydown', handleGlobalKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selected, id, setNodes, setEdges, getNodes, label, bgColor, textColor, data.side]);

  return (
    <div 
      onDoubleClick={onDoubleClick}
      style={{
      padding: '8px 16px',
      borderRadius: '8px',
      background: bgColor,
      border: `2px solid ${selected ? 'var(--primary)' : 'var(--node-border)'}`,
      boxShadow: selected ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'var(--shadow-md)',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      color: textColor,
      minWidth: '120px',
      textAlign: 'center',
      fontWeight: '500',
      position: 'relative',
      cursor: isEditing ? 'text' : 'pointer',
      transition: 'box-shadow 0.2s, border 0.2s'
    }}>
      
      {/* Floating Toolbar for colors when node is selected */}
      {selected && !isEditing && (
        <div 
          style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--node-bg)',
          borderRadius: '6px',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-color)',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 20
        }}>
           <div style={{ position: 'relative' }}>
             <button 
               onClick={(e) => { e.stopPropagation(); setShowBgPalette(!showBgPalette); setShowTextPalette(false); }}
               title="Couleur de fond"
               style={{ width: '20px', height: '20px', backgroundColor: bgColor, borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0 }}
             />
             {showBgPalette && (
               <div style={{ position: 'absolute', top: '28px', left: '-20px', background: 'var(--panel-bg)', padding: '6px', borderRadius: '6px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', zIndex: 100 }}>
                 {['#ffffff', '#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff'].map(c => (
                   <button key={c} onClick={(e) => { e.stopPropagation(); setBgColor(c); updateNodeData({ bgColor: c }); setShowBgPalette(false); }} style={{ width: '20px', height: '20px', background: c, border: '1px solid #cbd5e1', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
                 ))}
               </div>
             )}
           </div>
           
           <div style={{ width: '1px', background: 'var(--border-color)', height: '18px' }}></div>
           
           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
             <span style={{ fontWeight: 'bold', color: textColor, fontSize: '15px', marginRight: '4px', pointerEvents: 'none' }}>A</span>
             <button 
               onClick={(e) => { e.stopPropagation(); setShowTextPalette(!showTextPalette); setShowBgPalette(false); }}
               title="Couleur du texte"
               style={{ width: '16px', height: '16px', backgroundColor: textColor, borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0 }}
             />
             {showTextPalette && (
               <div style={{ position: 'absolute', top: '28px', left: '-10px', background: 'var(--panel-bg)', padding: '6px', borderRadius: '6px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', zIndex: 100 }}>
                 {['#0f172a', '#ffffff', '#7f1d1d', '#1e3a8a'].map(c => (
                   <button key={c} onClick={(e) => { e.stopPropagation(); setTextColor(c); updateNodeData({ textColor: c }); setShowTextPalette(false); }} style={{ width: '20px', height: '20px', background: c, border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 }} />
                 ))}
               </div>
             )}
           </div>
           
           <div style={{ width: '1px', background: 'var(--border-color)', height: '18px' }}></div>
           <button 
             onClick={onDelete}
             style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             title="Supprimer"
           >
             <Trash2 size={16} />
           </button>
        </div>
      )}

      {/* PRIMARY HANDLES (These must render FIRST so ReactFlow uses them as default connection points when id is null) */}
      <Handle type="target" position={Position.Left} style={{ background: '#94a3b8', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#94a3b8', width: 8, height: 8 }} />
      
      <div style={{ cursor: isEditing ? 'text' : 'pointer', pointerEvents: isEditing ? 'auto' : 'none' }}>
        <RichTextEditor
          content={label}
          onChange={onChange}
          placeholder="Nouvelle idée"
          readOnly={!isEditing}
        />
      </div>

      {selected && !isEditing && (
        <>
          <button 
            onClick={(e) => onAddChild(e, 'left')}
            title="Ajouter une idée à gauche (Raccourci: Shift+Tab)"
            style={{
              position: 'absolute',
              left: '-16px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 10
            }}>
            <Plus size={14} />
          </button>
          
          <button 
            onClick={(e) => onAddChild(e, 'right')}
            title="Ajouter une idée à droite (Raccourci: Tab)"
            style={{
              position: 'absolute',
              right: '-16px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 10
            }}>
            <Plus size={14} />
          </button>
        </>
      )}

      {/* Boutons de Repli des enfants */}
      {data.hasLeftChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateNodeData({ collapsedLeft: !data.collapsedLeft });
          }}
          title={data.collapsedLeft ? "Déplier à gauche" : "Replier à gauche"}
          style={{
            position: 'absolute',
            left: '-12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--panel-bg)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 15,
            padding: 0
          }}>
          {data.collapsedLeft ? <Plus size={10} strokeWidth={3} /> : <Minus size={10} strokeWidth={3} />}
        </button>
      )}

      {data.hasRightChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateNodeData({ collapsedRight: !data.collapsedRight });
          }}
          title={data.collapsedRight ? "Déplier à droite" : "Replier à droite"}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--panel-bg)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 15,
            padding: 0
          }}>
          {data.collapsedRight ? <Plus size={10} strokeWidth={3} /> : <Minus size={10} strokeWidth={3} />}
        </button>
      )}
      
      {/* SECONDARY HANDLES (Hidden anchors used exclusively for bi-directional Left children branching) */}
      <Handle type="source" id="source-left" position={Position.Left} style={{ opacity: 0, width: 8, height: 8, top: '60%' }} />
      <Handle type="target" id="target-right" position={Position.Right} style={{ opacity: 0, width: 8, height: 8, top: '60%' }} />
    </div>
  );
}
