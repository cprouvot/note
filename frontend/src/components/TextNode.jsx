import React, { useState } from 'react';
import { useReactFlow, NodeResizeControl } from 'reactflow';
import { Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

export default function TextNode({ id, data, selected }) {
  const [text, setText] = useState(data.text || '');
  const [fontSize, setFontSize] = useState(data.fontSize || 16);
  const [textColor, setTextColor] = useState(data.textColor || 'var(--text-main)');
  const [showColorPalette, setShowColorPalette] = useState(false);

  const { setNodes, deleteElements } = useReactFlow();

  const onDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateNodeData = (newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, ...newData };
        }
        return node;
      })
    );
  };

  const onChange = (html) => {
    setText(html);
    updateNodeData({ text: html });
  };

  const increaseSize = () => {
    const newSize = fontSize + 2;
    setFontSize(newSize);
    updateNodeData({ fontSize: newSize });
  };

  const decreaseSize = () => {
    const newSize = Math.max(10, fontSize - 2);
    setFontSize(newSize);
    updateNodeData({ fontSize: newSize });
  };

  const textColors = ['var(--text-main)', '#ffffff', '#7f1d1d', '#1e3a8a', '#14532d', '#b45309', '#0f172a'];

  return (
    <>
      <NodeResizeControl 
        minWidth={50} 
        minHeight={30}
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
             width: 12,
             height: 12,
             borderRight: '3px solid rgba(0,0,0,0.6)',
             borderBottom: '3px solid rgba(0,0,0,0.6)'
          }} />
        </div>
      </NodeResizeControl>

      <div style={{
        position: 'relative',
        padding: '4px',
        fontSize: `${fontSize}px`,
        fontFamily: 'Inter, sans-serif',
        color: textColor,
        width: '100%',
        height: '100%',
        minWidth: '50px',
        minHeight: '30px',
        border: selected ? '1px dashed var(--primary)' : '1px dashed transparent',
        background: 'transparent'
      }}>
        {selected && (
          <div style={{
            position: 'absolute',
            top: '-38px',
            left: '0',
            background: 'var(--panel-bg)',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)',
            padding: '4px',
            display: 'flex',
            gap: '8px',
            zIndex: 100,
            alignItems: 'center'
          }}>
            <button 
               onClick={decreaseSize}
               style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 'bold', fontSize: '13px' }}
               title="Diminuer la taille"
            >
              A-
            </button>
            
            <button 
               onClick={increaseSize}
               style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 'bold', fontSize: '15px' }}
               title="Augmenter la taille"
            >
              A+
            </button>
  
            <div style={{ width: '1px', background: 'var(--border-color)', height: '18px' }}></div>
            
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
               <button 
                 onClick={() => setShowColorPalette(!showColorPalette)}
                 style={{ 
                   width: '18px', height: '18px', 
                   backgroundColor: textColor === 'var(--text-main)' ? '#94a3b8' : textColor, 
                   borderRadius: '3px', border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0 
                 }}
                 title="Changer la couleur"
               />
               {showColorPalette && (
                 <div style={{ 
                   position: 'absolute', top: '24px', left: '-10px', 
                   background: 'var(--panel-bg)', padding: '6px', borderRadius: '6px', 
                   boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', 
                   display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', zIndex: 100 
                 }}>
                   {textColors.map(c => (
                     <button 
                       key={c} 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         setTextColor(c); 
                         updateNodeData({ textColor: c }); 
                         setShowColorPalette(false); 
                       }} 
                       style={{ 
                         width: '20px', height: '20px', 
                         background: c === 'var(--text-main)' ? '#94a3b8' : c, 
                         border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: 0 
                       }} 
                     />
                   ))}
                 </div>
               )}
            </div>

            <div style={{ width: '1px', background: 'var(--border-color)', height: '18px', margin: '0 2px' }}></div>
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
          </div>
        )}
  
        <RichTextEditor
           content={text}
           onChange={onChange}
           placeholder="Texte libre..."
        />
      </div>
    </>
  );
}
