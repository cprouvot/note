import { socket } from './socket';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

export const syncEmitter = new EventTarget();

const _fetch = async (url, options) => {
  const isMutation = options && options.method && options.method !== 'GET';
  if (isMutation) syncEmitter.dispatchEvent(new CustomEvent('sync', { detail: 'syncing' }));
  try {
    const res = await fetch(url, options);
    if (isMutation) {
      setTimeout(() => syncEmitter.dispatchEvent(new CustomEvent('sync', { detail: 'saved' })), 600);
    }
    return res;
  } catch (err) {
    if (isMutation) syncEmitter.dispatchEvent(new CustomEvent('sync', { detail: 'saved' }));
    throw err;
  }
};

const getHeaders = () => {
  const token = localStorage.getItem('mindboard_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(socket.id ? { 'x-socket-id': socket.id } : {})
  };
};

export const api = {
  login: async (email, password) => {
    const res = await _fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    return res.json();
  },


  // --- BOARDS ---
  getBoards: async () => {
    const res = await _fetch(`${API_URL}/boards`, { headers: getHeaders() });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('mindboard_token'); // Auto logout on expiration
      throw new Error('Unauthorized');
    }
    return res.json();
  },
  getBoard: async (id) => {
    const res = await _fetch(`${API_URL}/boards/${id}`, { headers: getHeaders() });
    return res.json();
  },
  reorderBoards: async (boardIds) => {
    const res = await _fetch(`${API_URL}/boards/reorder/batch`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ boardIds }) });
    return res.json();
  },
  createBoard: async (data) => {
    const res = await _fetch(`${API_URL}/boards`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return res.json();
  },
  updateBoard: async (id, data) => {
    const res = await _fetch(`${API_URL}/boards/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return res.json();
  },
  deleteBoard: async (id) => {
    const res = await _fetch(`${API_URL}/boards/${id}`, { method: 'DELETE', headers: getHeaders() });
    return res.json();
  },

  // --- TASKS ---
  getCategories: async () => {
    const res = await _fetch(`${API_URL}/tasks/categories`, { headers: getHeaders() });
    return res.json();
  },
  updateCategories: async (categories) => {
    const res = await _fetch(`${API_URL}/tasks/categories`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ categories }) });
    return res.json();
  },
  getTasks: async () => {
    const res = await _fetch(`${API_URL}/tasks`, { headers: getHeaders() });
    return res.json();
  },
  createTask: async (data) => {
    const res = await _fetch(`${API_URL}/tasks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return res.json();
  },
  updateTask: async (id, data) => {
    const res = await _fetch(`${API_URL}/tasks/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    return res.json();
  },
  deleteTask: async (id) => {
    const res = await _fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE', headers: getHeaders() });
    return res.json();
  },
  deleteTaskCategory: async (categoryName) => {
    const res = await _fetch(`${API_URL}/tasks/category/${encodeURIComponent(categoryName)}`, { method: 'DELETE', headers: getHeaders() });
    return res.json();
  },

  // --- ADMIN ---
  getUsers: async () => {
    const res = await _fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthorized admin access');
    return res.json();
  },
  createUser: async (data) => {
    const res = await _fetch(`${API_URL}/admin/users`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error || 'Erreur requête');
    return res.json();
  },
  updateUserRole: async (id, role) => {
    const res = await _fetch(`${API_URL}/admin/users/${id}/role`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ role }) });
    return res.json();
  },
  deleteUser: async (id) => {
    const res = await _fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: getHeaders() });
    return res.json();
  }
};
