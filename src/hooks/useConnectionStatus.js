// src/hooks/useConnectionStatus.js
import { useState, useEffect } from 'react'; // ✅ ADD THIS IMPORT
import { fetchServerInfo } from '../api/info';

const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await fetchServerInfo();
        setIsOnline(true);
        setLastSyncTime(new Date());
      } catch (err) {
        console.error('❌ Connection check failed:', err);
        setIsOnline(false);
      }
    };

    const interval = setInterval(checkConnection, 15000); // Check every 15 seconds
    checkConnection(); // Initial check
    
    return () => clearInterval(interval);
  }, []);

  return { isOnline, lastSyncTime };
};

export default useConnectionStatus;