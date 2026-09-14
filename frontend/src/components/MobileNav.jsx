import React from 'react';
import { Map as MapIcon, ListTodo, User } from 'lucide-react';

// Barre de navigation en bas d'écran (mobile) : bascule entre la carte et les tâches
export default function MobileNav({ view, onChange, onOpenAccount }) {
  const renderTab = (key, label, icon) => (
    <button
      type="button"
      className={`mobile-nav-item${view === key ? ' is-active' : ''}`}
      aria-current={view === key ? 'page' : undefined}
      onClick={() => onChange(key)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="mobile-nav" aria-label="Navigation principale">
      {renderTab('map', 'Carte', <MapIcon size={22} aria-hidden="true" />)}
      {renderTab('tasks', 'Tâches', <ListTodo size={22} aria-hidden="true" />)}
      <button type="button" className="mobile-nav-item" aria-haspopup="dialog" onClick={onOpenAccount}>
        <User size={22} aria-hidden="true" />
        <span>Compte</span>
      </button>
    </nav>
  );
}
