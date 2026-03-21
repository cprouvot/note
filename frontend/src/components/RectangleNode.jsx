import React, { useState } from 'react';
import { useReactFlow, NodeResizeControl } from 'reactflow';

export default function RectangleNode({ id, data, selected }) {
  const [color, setColor] = useState(data.color || '#fef08a');
  const { setNodes } = useReactFlow();

  const onColorChange = (evt) => {
    const newColor = evt.target.value;
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

  return (
    <>
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
          right: 5,
          bottom: 5,
          width: 16,
          height: 16,
          borderRight: '3px solid rgba(0,0,0,0.6)',
          borderBottom: '3px solid rgba(0,0,0,0.6)',
          cursor: 'se-resize',
          zIndex: 100
        }} title="Redimensionner" />
      </NodeResizeControl>
      
      <div style={{
        borderRadius: '8px',
        background: color,
        border: `2px solid ${selected ? 'var(--primary)' : 'transparent'}`,
        boxShadow: 'var(--shadow-md)',
        width: '100%',
        height: '100%',
        minWidth: '150px',
        minHeight: '100px',
        position: 'relative'
      }}>
        {selected && (
          <label 
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              cursor: 'pointer',
              background: 'white',
              borderRadius: '4px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 10
            }}
            title="Modifier la couleur"
          >
            <input 
              type="color" 
              value={color}
              onChange={onColorChange}
              style={{
                opacity: 0,
                position: 'absolute',
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: color,
              borderRadius: '2px',
              border: '1px solid rgba(0,0,0,0.2)'
            }}></div>
          </label>
        )}
      </div>
    </>
  );
}
