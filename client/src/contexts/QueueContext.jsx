import { useContext } from 'react';
import QueueContext from './QueueContextBase';

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used within a QueueProvider');
  return ctx;
}

