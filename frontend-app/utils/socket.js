// utils/socket.js
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

let realSocketPromise = null;

async function createRealSocket() {
  const token = await AsyncStorage.getItem('token');

  const socketInstance = io(API_BASE_URL.replace(/\/$/, ''), {
    transports: ['websocket'],
    autoConnect: true,
    auth: { token },
  });

  // Refresh token on reconnect attempts (keeps auth current)
  socketInstance.on('reconnect_attempt', async () => {
    const freshToken = await AsyncStorage.getItem('token');
    socketInstance.auth = { token: freshToken };
  });

  // Periodically ensure auth token is fresh (helps when refresh occurs quietly)
  let lastToken = token;
  const interval = setInterval(async () => {
    try {
      const current = await AsyncStorage.getItem('token');
      if (current && current !== lastToken) {
        lastToken = current;
        socketInstance.auth = { token: current };
        if (socketInstance.disconnected) {
          socketInstance.connect();
        }
      }
    } catch {}
  }, 5000);

  socketInstance.on('disconnect', () => {
    // keep interval running; connect cycle will pick up fresh token
  });

  return socketInstance;
}

function getSocket() {
  if (!realSocketPromise) {
    realSocketPromise = createRealSocket();
  }
  return realSocketPromise;
}

// Proxy object that existing code can import and use synchronously
const socket = {
  on: (event, handler) => {
    getSocket().then(s => s.on(event, handler))
      .catch(e => console.warn('Socket on() failed to initialize:', e));
  },
  off: (event, handler) => {
    getSocket().then(s => s.off(event, handler))
      .catch(e => console.warn('Socket off() failed to initialize:', e));
  },
  emit: (...args) => {
    getSocket().then(s => s.emit(...args))
      .catch(e => console.warn('Socket emit() failed to initialize:', e));
  },
  // Optional: expose a method to access the underlying socket if someone wants async usage
  getRaw: () => getSocket(),
};

export { getSocket };
export default socket;
