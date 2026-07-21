'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001';

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('⚡ Socket.io Bağlantısı Kuruldu:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Socket.io Bağlantısı Koptu');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const joinChannel = (channelId: string) => {
    socketRef.current?.emit('joinChannel', { channelId });
  };

  const leaveChannel = (channelId: string) => {
    socketRef.current?.emit('leaveChannel', { channelId });
  };

  const sendTyping = (channelId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { channelId, isTyping });
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinChannel,
    leaveChannel,
    sendTyping,
  };
}
