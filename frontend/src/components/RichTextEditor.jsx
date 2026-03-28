import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Strikethrough, Highlighter, List, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import './RichTextEditor.css';

export default function RichTextEditor({ content, onChange, placeholder = 'Tapez votre texte...', readOnly = false, className = '' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Désactivation des syntaxes avancées inutiles pour un post-it basique
        heading: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Highlight.configure({
        multicolor: true, // Cmd+Shift+H natively
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Propagation de la chaîne HTML
      onChange(editor.getHTML());
    },
  });

  // Gérer la désynchronisation externe sans casser le focus (ex: via Undo/Redo/Serveur)
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  // Wrapper standard avec la classe 'nodrag nopan' requise par ReactFlow pour que la saisie 
  // soit complètement capturée par l'éditeur et non avalée par la surcouche canvas.
  // On bloque aussi la propagation du 'keydown' pour éviter de trigger l'Undo/Redo en écrivant un 'z'.
  return (
    <div 
      className={`rich-text-editor nodrag nopan ${className}`}
      onKeyDown={(e) => {
        // Bloque le raccourci global si on tape Z dans l'éditeur :
        if (!e.metaKey && !e.ctrlKey) {
            e.stopPropagation();
        }
      }}
    >
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bubble-menu">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Gras">
            <Bold size={14} />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italique">
            <Italic size={14} />
          </button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Barré">
            <Strikethrough size={14} />
          </button>
          <div style={{ width: '1px', background: '#cbd5e1', height: '14px', margin: '0 4px' }} />
          <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'is-active' : ''} title="Surligner">
            <div className="bubble-divider"></div>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`bubble-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            title="Liste à puces"
          >
            <List size={16} />
          </button>

          <div className="bubble-divider"></div>

          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`bubble-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
            title="Aligner à gauche"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`bubble-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
            title="Centrer"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`bubble-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
            title="Aligner à droite"
          >
            <AlignRight size={16} />
          </button>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
