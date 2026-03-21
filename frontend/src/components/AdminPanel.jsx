import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './AdminPanel.css';

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.getUsers();
        setUsers(data);
      } catch (err) {
        setError(err.message || 'Erreur lors du chargement des utilisateurs');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const changeRole = async (id, newRole) => {
    try {
      const updatedUser = await api.updateUserRole(id, newRole);
      setUsers(users.map(u => u.id === id ? updatedUser : u));
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm("Bannir et effacer définitivement cet utilisateur de la base de données ainsi que TOUTES ses cartes et tâches ? Cette action est irréversible.")) {
      try {
        await api.deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setCreateLoading(true);
    try {
      const created = await api.createUser({ email: newEmail, password: newPassword, role: newRole });
      setUsers([created, ...users]);
      setNewEmail('');
      setNewPassword('');
      setNewRole('USER');
    } catch (err) {
      alert(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="admin-overlay">
      <div className="admin-modal">
        <div className="admin-header">
          <h2>Tableau de bord Administrateur</h2>
          <button className="close-admin-btn" onClick={onClose} title="Fermer le panneau">&times;</button>
        </div>
        
        {error ? (
          <div className="error-message" style={{marginBottom: '16px'}}>{error}</div>
        ) : loading ? (
          <div style={{textAlign: 'center', color: '#64748b'}}>Chargement des comptes utilisateurs...</div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <input 
                type="email" placeholder="Nouvel Email" required
                value={newEmail} onChange={e => setNewEmail(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1 }}
              />
              <input 
                type="password" placeholder="Mot de passe" required
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1 }}
              />
              <select 
                value={newRole} onChange={e => setNewRole(e.target.value)}
                className="role-selector"
                style={{ padding: '8px 12px' }}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button type="submit" disabled={createLoading} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: '600', cursor: createLoading ? 'not-allowed' : 'pointer', minWidth: '140px' }}>
                {createLoading ? 'Création...' : 'Créer un compte'}
              </button>
            </form>
            
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rôle Global</th>
                  <th>Date d'inscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{fontWeight: 500}}>{u.email}</td>
                    <td>
                      <select 
                        value={u.role} 
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="role-selector"
                      >
                        <option value="USER">Utilisateur (USER)</option>
                        <option value="ADMIN">Administrateur (ADMIN)</option>
                      </select>
                    </td>
                    <td style={{color: '#64748b'}}>{new Date(u.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <button className="delete-user-btn" onClick={() => deleteUser(u.id)}>
                        Bannir / Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
