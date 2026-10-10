import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import * as SecureStore from "expo-secure-store";

type ThemeContextValue = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Every screen previously kept its own `useState(true)` for isDarkMode, which
// is why the theme reset to dark on every navigation -- each screen mounted
// with its own fresh default instead of sharing one value. This context is
// the single source of truth, persisted so it survives app restarts too.
const STORAGE_KEY = "oams_dark_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  // Starts true so consumers (namely _layout.tsx's loading gate) can wait for
  // the stored preference to load before rendering anything -- otherwise a
  // user with a saved light-mode preference could see a one-frame dark flash
  // on cold start, since AuthContext's own loading gate can resolve faster
  // than this SecureStore read when there's no logged-in session to fetch.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (stored !== null) setIsDarkMode(stored === "true");
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      SecureStore.setItemAsync(STORAGE_KEY, String(next)).catch((error) =>
        console.error("Failed to save theme preference:", error),
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isDarkMode, toggleTheme, isLoading }),
    [isDarkMode, toggleTheme, isLoading],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
