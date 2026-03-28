import React from 'react';
import { NodeResizeControl } from 'reactflow';
import { Image as ImageIcon } from 'lucide-react';

export default function ImageNode({ id, data, selected }) {
  return (
    <>
      <NodeResizeControl 
        minWidth={100} 
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

      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: '100px',
        minHeight: '100px',
        border: selected ? '2px solid var(--primary)' : '2px dashed var(--border-color)',
        boxShadow: selected ? 'var(--shadow-md)' : 'none',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {data.src ? (
          <img 
            src={data.src} 
            alt="Upload"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none'
            }}
          />
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={32} opacity={0.5} />
            <span style={{ fontSize: '13px' }}>Image invalide</span>
          </div>
        )}
      </div>
    </>
  );
}
