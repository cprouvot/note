import { socket } from './socket';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

// Émet 'sync' avec detail = { status: 'syncing' | 'saved' | 'error', error?: string }
export const syncEmitter = new EventTarget();

// Suivi des écritures : requêtes en cours et dernier échec par ressource (URL).
// Une réussite ultérieure sur la même URL efface l'échec correspondant.
let inFlightCount = 0;
const failedMutations = new Map(); // url -> { options, message }
const latestRequestIds = new Map(); // url -> numéro de la dernière requête lancée
let savedTimer = null;

const emitSyncState = () => {
  clearTimeout(savedTimer);
  const emit = (detail) => syncEmitter.dispatchEvent(new CustomEvent('sync', { detail }));
  if (inFlightCount > 0) return emit({ status: 'syncing' });
  if (failedMutations.size > 0) {
    const messages = [...new Set([...failedMutations.values()].map(f => f.message))];
    return emit({ status: 'error', error: messages.join(' · ') });
  }
  savedTimer = setTimeout(() => emit({ status: 'saved' }), 600);
};

// Émet 'expired' quand le serveur refuse la session (jeton expiré, invalide ou absent)
export const authEmitter = new EventTarget();
const TOKEN_KEY = 'mindboard_token';

// Session glissante : le backend renvoie un jeton prolongé dans cet en-tête tant que l'application est utilisée
const handleAuthResponse = (url, res) => {
  const refreshedToken = res.headers?.get?.('X-Refreshed-Token');
  if (refreshedToken) localStorage.setItem(TOKEN_KEY, refreshedToken);
  if (res.status === 401 && !url.endsWith('/auth/login')) {
    authEmitter.dispatchEvent(new CustomEvent('expired'));
  }
};

const getErrorMessage = async (res) => {
  if (res.status === 413) return 'Contenu trop volumineux pour être enregistré (images trop lourdes ?)';
  if (res.status === 401) return 'Session expirée : reconnectez-vous';
  try {
    const body = await res.clone().json();
    if (body?.error) return body.error;
  } catch { /* corps non JSON */ }
  return `Erreur serveur (${res.status})`;
};

const _fetch = async (url, options) => {
  const isMutation = options && options.method && options.method !== 'GET';
  if (!isMutation) {
    const res = await fetch(url, options);
    handleAuthResponse(url, res);
    return res;
  }

  // Seule la dernière requête lancée sur une URL décide de son état (évite qu'une réponse tardive l'écrase)
  const requestId = (latestRequestIds.get(url) || 0) + 1;
  latestRequestIds.set(url, requestId);
  const isLatest = () => latestRequestIds.get(url) === requestId;

  inFlightCount++;
  emitSyncState();
  try {
    const res = await fetch(url, options);
    handleAuthResponse(url, res);
    const message = res.ok ? null : await getErrorMessage(res);
    if (isLatest()) {
      if (message) failedMutations.set(url, { options, message });
      else failedMutations.delete(url);
    }
    return res;
  } catch (err) {
    if (isLatest()) failedMutations.set(url, { options, message: 'Serveur injoignable : modifications non enregistrées' });
    throw err;
  } finally {
    inFlightCount--;
    emitSyncState();
  }
};

// Sauvegardes différées (debounce) pas encore envoyées : clé -> fonction d'envoi
const pendingSaves = new Map();

export const schedulePendingSave = (key, save) => pendingSaves.set(key, save);

// Abandonne une sauvegarde en attente devenue caduque (contenu remplacé par la version serveur)
export const cancelPendingSave = (key) => pendingSaves.delete(key);

// Envoie immédiatement la sauvegarde en attente (fin du délai, changement de carte, fermeture)
export const flushPendingSave = (key) => {
  const save = pendingSaves.get(key);
  if (!save) return;
  pendingSaves.delete(key);
  save();
};

export const hasUnsavedChanges = () =>
  pendingSaves.size > 0 || inFlightCount > 0 || failedMutations.size > 0;

// Alerte du navigateur si l'onglet est fermé ou rechargé avec des modifications non enregistrées.
// Les sauvegardes en attente partent tout de suite : elles aboutissent souvent pendant que l'alerte est affichée.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (!hasUnsavedChanges()) return;
    [...pendingSaves.keys()].forEach(flushPendingSave);
    event.preventDefault();
    event.returnValue = ''; // requis par certains navigateurs pour afficher l'alerte
  });
}

// Rejoue la dernière écriture échouée de chaque ressource
// (en-têtes régénérés : le jeton a pu changer depuis l'échec, par exemple après reconnexion)
export const retryFailedMutations = () =>
  Promise.allSettled([...failedMutations].map(([url, { options }]) =>
    _fetch(url, { ...options, headers: { ...options.headers, ...getHeaders() } })));

export const hasFailedMutations = () => failedMutations.size > 0;

// Changement de compte : les modifications de l'ancien compte ne doivent pas être rejouées
export const discardUnsavedChanges = () => {
  pendingSaves.clear();
  failedMutations.clear();
  emitSyncState();
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
    // Une session expirée est signalée via authEmitter (voir handleAuthResponse)
    if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : `Erreur ${res.status}`);
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
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    return res.json();
  },
  updateCategories: async (categories) => {
    const res = await _fetch(`${API_URL}/tasks/categories`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ categories }) });
    return res.json();
  },
  getTasks: async () => {
    const res = await _fetch(`${API_URL}/tasks`, { headers: getHeaders() });
    // Sans ce contrôle, un objet { error } serait pris pour la liste des tâches (plantage de l'écran)
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
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
