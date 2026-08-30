// Tiny pub/sub bridging the single global left-edge swipe gesture (wired once
// in app/_layout.tsx, since GestureDetector needs to sit above expo-router's
// <Stack> to see touches before any screen does) to whichever screen is
// currently focused and wants to open its own nav drawer. Each screen owns
// its `menuOpen` state locally (there's no shared drawer/navigation state in
// this app), so a global gesture can't just flip one flag -- it has to notify
// the current screen to flip its own.
type Listener = () => void;
const listeners = new Set<Listener>();

// Called by a focused screen's useDrawerSwipeOpen() hook; returns the
// unsubscribe function.
export function subscribeToDrawerSwipe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Fired once per completed edge swipe. Only the currently-focused screen is
// subscribed at any given time (see useDrawerSwipeOpen, which subscribes via
// useFocusEffect) even though expo-router's native Stack keeps earlier
// screens mounted underneath for the back-swipe transition -- so this can't
// accidentally pop open a drawer on a screen further back in the stack.
export function emitDrawerSwipeOpen() {
  listeners.forEach((listener) => listener());
}
