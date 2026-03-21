import React, { useState } from 'react';
import { useReactFlow } from 'reactflow';

export default function TextNode({ id, data, selected }) {
  const [text, setText] = useState(data.text || '');
  const { setNodes } = useReactFlow();

  const onChange = (evt) => {
    setText(evt.target.value);
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, text: evt.target.value };
        }
        return node;
      })
    );
  };

  return (
    <div style={{
      padding: '4px',
      fontSize: '16px',
      fontFamily: 'Inter, sans-serif',
      color: 'var(--text-main)',
      minWidth: '50px',
      border: selected ? '1px dashed var(--primary)' : '1px dashed transparent',
      background: 'transparent'
    }}>
      <textarea
        value={text}
        onChange={onChange}
        placeholder="Texte libre..."
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          resize: 'both',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
          minWidth: '100px',
          minHeight: '30px',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}
