import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import api from '../utils/api';

// Shared by every professor screen's drawer -- lifted out of
// professor_dashboard.tsx (the only screen that originally had this) so the
// Available/Unavailable toggle behaves identically everywhere instead of
// being duplicated per-file, mirroring web's own move of this same toggle
// into the shared ProfessorSidebar.jsx component.
//
// Uses the lightweight GET/PATCH /professor/availability-status endpoints
// (not the full /professor/dashboard-stats payload) since most consumers of
// this hook don't need anything else from that payload.
export function useProfessorAvailability() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailableReasonModalOpen, setUnavailableReasonModalOpen] = useState(false);
  const [unavailableReasonText, setUnavailableReasonText] = useState('');
  const [unavailableReasonSubmitting, setUnavailableReasonSubmitting] = useState(false);

  const fetchAvailability = useCallback(async () => {
    try {
      const { data } = await api.get('/professor/availability-status');
      setIsAvailable((data.availabilityStatus ?? 'available') === 'available');
    } catch (err) {
      console.error('Fetch availability status error:', err);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Going Available needs no reason and fires immediately. Going Unavailable
  // requires one -- the server 400s otherwise (professorRoutes.js) -- so that
  // path just opens the reason modal instead; the actual PATCH happens in
  // confirmMarkUnavailable() once the professor submits a reason.
  const toggleAvailability = async (value: boolean) => {
    if (!value) {
      setUnavailableReasonText('');
      setUnavailableReasonModalOpen(true);
      return;
    }
    const prev = isAvailable;
    setIsAvailable(true);
    try {
      await api.patch('/professor/availability-status', { status: 'available' });
    } catch (err) {
      console.error('Update availability error:', err);
      setIsAvailable(prev);
      Alert.alert('Error', 'Could not update availability status.');
    }
  };

  const confirmMarkUnavailable = async (reason: string) => {
    if (!reason.trim() || unavailableReasonSubmitting) return;
    setUnavailableReasonSubmitting(true);
    try {
      await api.patch('/professor/availability-status', { status: 'unavailable', reason: reason.trim() });
      setIsAvailable(false);
      setUnavailableReasonModalOpen(false);
      setUnavailableReasonText('');
    } catch (err) {
      console.error('Update availability error:', err);
      Alert.alert('Error', 'Could not update availability status.');
    } finally {
      setUnavailableReasonSubmitting(false);
    }
  };

  const cancelUnavailableModal = () => {
    setUnavailableReasonModalOpen(false);
    setUnavailableReasonText('');
  };

  return {
    isAvailable,
    unavailableReasonModalOpen,
    unavailableReasonText,
    unavailableReasonSubmitting,
    setUnavailableReasonText,
    toggleAvailability,
    confirmMarkUnavailable,
    cancelUnavailableModal,
  };
}
