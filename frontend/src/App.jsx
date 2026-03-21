import React, { useState, useEffect, useCallback } from 'react';
import { ListTodo, X, Menu, User } from 'lucide-react';
/* CSS imported in MindMap */
import './index.css';
import './App.css';

import MindMap from './components/MindMap';
import TodoSidebar from './components/TodoSidebar';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';

function App() {
  const [token, setToken] = useState(localStorage.getItem('miro_token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('miro_user')); } catch { return null; }
  });

  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    localStorage.removeItem('miro_token');
    localStorage.removeItem('miro_user');
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
              onClick={() => setMenuOpen(!menuOpen)}
              title="Menu Utilisateur"
              style={{
                background: 'white',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <User size={20} />
            </button>
            
            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                background: 'white',
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
            className="toggle-sidebar-btn" 
            title={isSidebarOpen ? "Fermer la liste des tâches" : "Ouvrir la liste des tâches"}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
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
        </div>

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
