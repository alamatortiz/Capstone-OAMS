import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth, getRouteRole } from '../context/AuthContext';
import { QueueProvider } from '../context/QueueContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

// Routes reachable without being logged in.
const PUBLIC_SEGMENTS = new Set(['login', 'unauthorized']);

// Mirrors web's ProtectedRoute.tsx: unauthenticated -> /login, wrong-role -> /unauthorized.
// Centralized here (rather than per-screen) since expo-router's file-based routes for
// `(tabs)/pages/**` don't need to change to get this behavior.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  // Waited on too: for an unauthenticated cold start, AuthContext's own
  // isLoading can resolve before this SecureStore read does (no network call
  // needed when there's no session to fetch), which would otherwise let
  // login.tsx/index.tsx render one frame with the hardcoded dark default
  // before a saved light-mode preference flips it.
  const { isLoading: themeLoading } = useTheme();
  const isLoading = authLoading || themeLoading;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // useSegments() includes route-group names (e.g. "(tabs)") as literal
    // segments. login.tsx and pages/** live under app/(tabs)/, so their real
    // top-level name is one index in from what it'd be without the group;
    // unauthorized.tsx sits outside (tabs), so it stays at index 0.
    const rawSegments = segments as string[];
    const isTabsGroup = rawSegments[0] === '(tabs)';
    const topSegment = isTabsGroup ? rawSegments[1] : rawSegments[0];
    const isPublicRoute = topSegment === undefined || PUBLIC_SEGMENTS.has(topSegment);
    if (isPublicRoute) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    // Protected routes are shaped "(tabs)/pages/<role>/<screen>".
    const routeRole = isTabsGroup ? rawSegments[2] : rawSegments[1];
    if (routeRole !== getRouteRole(user.role)) {
      router.replace('/unauthorized');
    }
  }, [isLoading, isAuthenticated, user, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f0a' }}>
        <ActivityIndicator size="large" color="#00a63e" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueueProvider>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthGate>
          <Toast />
        </QueueProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
