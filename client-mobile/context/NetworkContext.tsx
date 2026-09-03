import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';

type NetworkContextValue = {
  isOnline: boolean;
};

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

// Single app-wide "are we online" flag, backing the offline-cache fallback
// in student_transactions.tsx/student_announcement.tsx/student_faq.tsx (and
// OfflineBanner.tsx). Deliberately just a boolean, not a full connection-
// quality model -- the only decision this app needs to make is "show cached
// data with a banner" vs "show live data normally".
//
// `isConnected`/`isInternetReachable` both start out `null` on some
// platforms until NetInfo's first real reading comes in -- defaulting to
// `true` (rather than `false`) avoids a false "you're offline" flash on
// every cold start while that first reading is still in flight.
export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useIsOnline(): boolean {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useIsOnline must be used within a NetworkProvider');
  }
  return ctx.isOnline;
}
