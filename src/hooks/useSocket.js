import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:5000';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to Real-Time Alert Server');
    });

    newSocket.on('new_alert', (alertData) => {
      console.log('🚨 Received real-time alert:', alertData);
      setLatestAlert(alertData);
    });

    return () => newSocket.close();
  }, []);

  const clearAlert = () => setLatestAlert(null);

  return { socket, latestAlert, clearAlert };
}
