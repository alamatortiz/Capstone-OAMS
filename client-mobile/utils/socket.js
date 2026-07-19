import { io } from "socket.io-client";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "";
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, "");

let socket = null;

// Lazily creates (or reuses) a single socket.io connection authenticated
// with the current JWT. Safe to call repeatedly — reconnects only if the
// token actually changed or there's no live connection.
export function connectSocket(token) {
  if (!token) return null;

  if (socket && socket.auth?.token === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
