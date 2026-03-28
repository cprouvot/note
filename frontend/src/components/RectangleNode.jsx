import React, { useState } from 'react';
import { useReactFlow, NodeResizeControl } from 'reactflow';
import { Lock, Unlock } from 'lucide-react';

export default function RectangleNode({ id, data, selected }) {
  const [color, setColor] = useState(data.color || '#fef08a');
  const [showColorPalette, setShowColorPalette] = useState(false);
  const { setNodes } = useReactFlow();

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
      
      <div style={{
        borderRadius: '8px',
        background: color,
        border: `2px solid ${selected ? 'var(--primary)' : 'transparent'}`,
        boxShadow: 'var(--shadow-md)',
        width: '100%',
        height: '100%',
        minWidth: '150px',
        minHeight: '100px',
        position: 'relative',
        transition: 'border 0.2s'
      }}>
        {selected && (
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
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowColorPalette(!showColorPalette); }}
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
                  title="Modifier la couleur"
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: color,
                    borderRadius: '2px',
                    border: '1px solid rgba(0,0,0,0.2)'
                  }}></div>
                </button>
                {showColorPalette && (
                  <div style={{ 
                    position: 'absolute', top: '34px', right: '0', 
                    background: 'var(--panel-bg)', padding: '6px', borderRadius: '6px', 
                    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', 
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', zIndex: 100 
                  }}>
                    {['#ffffff', '#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff'].map(c => (
                      <button 
                        key={c} 
                        onClick={(e) => { e.stopPropagation(); onColorChange(c); setShowColorPalette(false); }} 
                        style={{ 
                          width: '20px', height: '20px', 
                          background: c, 
                          border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 
                        }} 
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
