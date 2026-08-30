import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { subscribeToDrawerSwipe } from '@/utils/drawerSwipeBus';

// Opens this screen's own nav drawer when the global left-edge swipe gesture
// (app/_layout.tsx) fires, but only while this screen is actually focused --
// useFocusEffect subscribes on focus and unsubscribes on blur, so a swipe
// only ever opens the drawer of the screen currently on top, never one still
// mounted further back in expo-router's native Stack.
export function useDrawerSwipeOpen(onOpen: () => void) {
  useFocusEffect(
    useCallback(() => subscribeToDrawerSwipe(onOpen), [onOpen]),
  );
}
