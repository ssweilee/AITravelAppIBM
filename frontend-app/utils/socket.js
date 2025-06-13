import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

const socket = io(API_BASE_URL, {
  transports: ['websocket'],  // force pure WebSocket for native apps
  autoConnect: true, // automatically connect when the app starts
});

export default socket;