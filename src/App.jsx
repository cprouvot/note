import React from 'react';
/* CSS imported in MindMap */
import './index.css';
import './App.css';

import MindMap from './components/MindMap';
import TodoSidebar from './components/TodoSidebar';

function App() {
  return (
    <div className="app-container">
      <main className="mindmap-area">
        <MindMap />
      </main>
      <aside className="todo-sidebar-area">
        <TodoSidebar />
      </aside>
    </div>
  );
}

export default App;
