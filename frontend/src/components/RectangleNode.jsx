import React, { useState } from 'react';
import { useReactFlow, NodeResizeControl } from 'reactflow';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

export default function RectangleNode({ id, data, selected }) {
  const [color, setColor] = useState(data.color || '#fef08a');
  const [textColor, setTextColor] = useState(data.textColor || '#000000');
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showTextPalette, setShowTextPalette] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { setNodes, deleteElements } = useReactFlow();

  React.useEffect(() => {
    if (!selected && isEditing) setIsEditing(false);
  }, [selected, isEditing]);

  const onDoubleClick = (e) => {
    e.stopPropagation();
    if (!data.locked) setIsEditing(true);
  };

  const onDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const onColorChange = (newColor) => {
    setColor(newColor);
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, color: newColor };
        }
        return node;
      })
    );
  };

  const onTextColorChange = (newColor) => {
    setTextColor(newColor);
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, textColor: newColor };
        }
        return node;
      })
    );
  };

  const onTextChange = (html) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, text: html };
        }
        return node;
      })
    );
  };

  const onToggleLock = (e) => {
    e.stopPropagation();
    const isLocked = !data.locked;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, draggable: !isLocked, data: { ...node.data, locked: isLocked } };
        }
        return node;
      })
    );
  };

  return (
    <>
      {!data.locked && (
        <NodeResizeControl 
          minWidth={150} 
          minHeight={100}
          isVisible={selected}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0
          }}
        >
          <div style={{
            position: 'absolute',
            right: -10,
            bottom: -10,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: '10px',
            cursor: 'se-resize',
            zIndex: 100
          }} title="Redimensionner">
            <div style={{
               width: 14,
               height: 14,
               borderRight: '3px solid rgba(0,0,0,0.6)',
               borderBottom: '3px solid rgba(0,0,0,0.6)'
            }} />
          </div>
        </NodeResizeControl>
      )}
      
      <div 
        onDoubleClick={onDoubleClick}
        style={{
        borderRadius: '8px',
        background: color,
        border: `2px solid ${selected ? 'var(--primary)' : 'transparent'}`,
        boxShadow: 'var(--shadow-md)',
        width: '100%',
        height: '100%',
        minWidth: '150px',
        minHeight: '100px',
        position: 'relative',
        cursor: isEditing ? 'text' : (!data.locked ? 'pointer' : 'default'),
        transition: 'border 0.2s'
      }}>
        {selected && !isEditing && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, display: 'flex', gap: '8px' }}>
            <button 
              onClick={onToggleLock}
              style={{
                background: 'white',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: '#64748b'
              }}
              title={data.locked ? "Déverrouiller" : "Verrouiller"}
            >
              {data.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            {!data.locked && (
              <>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowColorPalette(!showColorPalette); setShowTextPalette(false); }}
                    style={{
                      background: 'white',
                      borderRadius: '4px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title="Couleur de fond"
                  >
                    <div style={{ width: '16px', height: '16px', backgroundColor: color, borderRadius: '2px', border: '1px solid rgba(0,0,0,0.2)' }}></div>
                  </button>
                  {showColorPalette && (
                    <div style={{ 
                      position: 'absolute', top: '34px', left: '-5px', 
                      background: 'var(--panel-bg)', padding: '6px', borderRadius: '6px', 
                      boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', 
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', zIndex: 100 
                    }}>
                      {['#ffffff', '#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff'].map(c => (
                        <button key={c} onClick={(e) => { e.stopPropagation(); onColorChange(c); setShowColorPalette(false); }} style={{ width: '20px', height: '20px', background: c, border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 }} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: textColor, fontSize: '15px', marginRight: '4px', pointerEvents: 'none' }}>A</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowTextPalette(!showTextPalette); setShowColorPalette(false); }}
                    style={{ 
                      width: '18px', height: '18px', 
                      backgroundColor: textColor, 
                      borderRadius: '3px', border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0 
                    }}
                    title="Couleur du texte"
                  />
                  {showTextPalette && (
                    <div style={{ 
                      position: 'absolute', top: '28px', left: '-10px', 
                      background: 'var(--panel-bg)', padding: '6px', borderRadius: '6px', 
                      boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', 
                      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', zIndex: 100 
                    }}>
                      {['#000000', '#ffffff', '#7f1d1d', '#1e3a8a', '#14532d', '#b45309', '#0f172a', '#475569'].map(c => (
                        <button key={c} onClick={(e) => { e.stopPropagation(); onTextColorChange(c); setShowTextPalette(false); }} style={{ width: '20px', height: '20px', background: c, border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 }} />
                      ))}
                    </div>
                  )}
               </div>
                
                <div style={{ width: '1px', background: '#cbd5e1', height: '18px', margin: '0 2px' }}></div>
                <button 
                  onClick={onDelete}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 4px',
                    color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        )}
        
        <div style={{ padding: '16px', height: '100%', boxSizing: 'border-box', color: textColor, pointerEvents: isEditing ? 'auto' : 'none' }}>
          <RichTextEditor 
             content={data.text} 
             onChange={onTextChange} 
             readOnly={data.locked || !isEditing}
             placeholder=""
          />
        </div>
      </div>
    </>
  );
}
