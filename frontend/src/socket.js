import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// On maintient un singleton de socket non-connecté par défaut.
export const socket = io(API_URL, {
  autoConnect: false,
});
