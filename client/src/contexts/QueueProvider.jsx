import { useCallback, useMemo, useState } from 'react';
import QueueContext from './QueueContextBase';

export function QueueProvider({ children }) {

  const [queues] = useState(() => []);

  const getActiveQueues = useCallback(() => {
    return queues;
  }, [queues]);

  const value = useMemo(
    () => ({
      queues,
      getActiveQueues,
    }),
    [queues, getActiveQueues]
  );

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

