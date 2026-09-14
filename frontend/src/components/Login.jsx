import React, { useState } from 'react';
import { api } from '../api';
import './Login.css';

// overlay : affichée par-dessus l'application (session expirée) sans perdre l'état en cours
export default function Login({ setToken, setUser, onLogin, notice, initialEmail = '', overlay = false }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('mindboard_token', data.token);
      localStorage.setItem('mindboard_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      onLogin?.(data.user);
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <div
      className={`login-container${overlay ? ' is-overlay' : ''}`}
      role={overlay ? 'dialog' : undefined}
      aria-modal={overlay ? 'true' : undefined}
      aria-labelledby="login-title"
    >
      <div className="login-box">
        <div className="login-logo">🧠 App</div>
        <h2 id="login-title">{overlay ? 'Session expirée' : 'Connexion'}</h2>
        <form onSubmit={handleSubmit} className="login-form">
          {notice && <div className="login-notice" role="status">{notice}</div>}
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="input-group">
            <label>Adresse e-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="votre@email.com"
            />
          </div>
          <div className="input-group">
            <label>Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
