import React, { useState, useEffect, useCallback } from 'react';
import { ListTodo, X } from 'lucide-react';
/* CSS imported in MindMap */
import './index.css';
import './App.css';

import MindMap from './components/MindMap';
import TodoSidebar from './components/TodoSidebar';

function App() {
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        // Restrict sidebar width between 300px and 800px
        if (newWidth >= 300 && newWidth <= 800) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div 
      className="app-container" 
      style={{ cursor: isResizing ? 'ew-resize' : 'auto' }}
    >
      <main className="mindmap-area">
        <MindMap />
        
        <button 
          className="toggle-sidebar-btn" 
          title={isSidebarOpen ? "Fermer la liste des tâches" : "Ouvrir la liste des tâches"}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 100,
            background: isSidebarOpen ? 'white' : 'var(--primary)',
            color: isSidebarOpen ? 'var(--text-main)' : 'white',
            border: isSidebarOpen ? '1px solid var(--border-color)' : 'none',
            borderRadius: '6px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
             e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
             e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isSidebarOpen ? <X size={20} /> : <ListTodo size={20} />}
        </button>

      </main>

      {isSidebarOpen && (
        <aside 
          className="todo-sidebar-area" 
          style={{ 
            width: sidebarWidth, 
            transition: isResizing ? 'none' : 'width 0.2s ease' 
          }}
        >
          <div 
            className="resize-handle" 
            onMouseDown={startResizing}
          />
          <TodoSidebar />
        </aside>
      )}
    </div>
  );
}

export default App;
