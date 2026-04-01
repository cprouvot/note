import React, { useState, useEffect, useCallback } from 'react';
import { ListTodo, X, Menu, User, Moon, Sun } from 'lucide-react';
/* CSS imported in MindMap */
import './index.css';
import './App.css';

import MindMap from './components/MindMap';
import TodoSidebar from './components/TodoSidebar';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';

function App() {
  const [token, setToken] = useState(localStorage.getItem('mindboard_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mindboard_user')); } catch { return null; }
  });

  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('mindboard_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mindboard_theme', theme);
  }, [theme]);

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

  if (!token || !user) {
    return <Login setToken={setToken} setUser={setUser} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('mindboard_token');
    localStorage.removeItem('mindboard_user');
    setToken(null);
    setUser(null);
  };

  return (
    <div 
      className="app-container" 
      style={{ cursor: isResizing ? 'ew-resize' : 'auto' }}
    >
      <main className="mindmap-area">
        <MindMap />
        
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button 
              className="app-header-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Menu Utilisateur"
              aria-label="Menu Utilisateur"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <User size={20} />
            </button>
            
            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '180px'
              }}>
                <div style={{ padding: '4px 8px', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #e2e8f0', marginBottom: '4px', wordBreak: 'break-all' }}>
                  {user?.email}
                </div>
                {user?.role === 'ADMIN' && (
                  <button 
                    onClick={() => { setShowAdmin(true); setMenuOpen(false); }}
                    style={{
                      background: '#0f172a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '13px',
                      textAlign: 'left'
                    }}
                  >
                    Administration
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    textAlign: 'left'
                  }}
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>

          <button 
            className="app-header-btn toggle-theme-btn"
            title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
            aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button 
            className={`app-header-btn toggle-sidebar-btn ${!isSidebarOpen ? 'primary-active' : ''}`}
            title={isSidebarOpen ? "Fermer la liste des tâches" : "Ouvrir la liste des tâches"}
            aria-label={isSidebarOpen ? "Fermer la liste des tâches" : "Ouvrir la liste des tâches"}
            aria-expanded={isSidebarOpen}
            aria-controls="todo-sidebar"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={20} /> : <ListTodo size={20} />}
          </button>
        </div>

      </main>

      {isSidebarOpen && (
        <aside 
          id="todo-sidebar"
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
