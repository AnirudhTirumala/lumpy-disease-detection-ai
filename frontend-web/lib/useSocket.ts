// lib/useSocket.ts
'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// One shared socket connection per browser tab, reused across every
// component that calls useSocket() — avoids opening a new WebSocket
// connection for every chat window / sidebar badge / etc.
let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({
      withCredentials: true, // sends the lumpy_session cookie for the server's auth check
      autoConnect: true,
    });
  }
  return sharedSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());
  const [connected, setConnected] = useState(socketRef.current.connected);

  useEffect(() => {
    const socket = socketRef.current;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}
