import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import api from "../utils/api";
import { disconnectSocket } from "../utils/socket";

// Auth now persists in localStorage (shared across tabs) instead of
// sessionStorage (private per tab) -- that's what used to make opening a
// second tab always look logged out. To avoid a login staying valid
// forever on a shared/lab computer, an inactivity timeout still logs the
// user out client-side after this long with no real interaction, on top of
// the JWT's own absolute server-side expiry.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 15 * 1000;
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;

type Role = "student" | "faculty" | "admin" | "superadmin";

type UserData = {
  userId: number;
  role: Role;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  departmentAbbrev?: string;
  studentNumber?: string;
  course?: string;
  yearLevel?: number;
  employeeId?: string;
  specialization?: string;
  position?: string;
};

type AuthContextValue = {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrSchoolId: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading to check session

  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  // Throttled so activity listeners firing on every mousemove/keydown don't
  // hammer localStorage -- only the last-write time needs to be recent, not
  // every single event.
  const lastActiveWriteRef = useRef(0);
  const touchLastActive = useCallback(() => {
    const now = Date.now();
    if (now - lastActiveWriteRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActiveWriteRef.current = now;
    localStorage.setItem("oams_last_active", String(now));
  }, []);

  const isIdleExpired = useCallback(() => {
    const lastActive = Number(localStorage.getItem("oams_last_active") || 0);
    return lastActive > 0 && Date.now() - lastActive > IDLE_TIMEOUT_MS;
  }, []);

  const saveAuthData = useCallback((user: UserData, token: string) => {
    localStorage.setItem("oams_user", JSON.stringify(user));
    localStorage.setItem("oams_token", token);
    setUser(user);
    setToken(token);
    touchLastActive();
  }, [touchLastActive]);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem("oams_user");
    localStorage.removeItem("oams_token");
    localStorage.removeItem("oams_last_active");
    setUser(null);
    setToken(null);
  }, []);

  // On app load, check for existing token and fetch user data
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("oams_token");
      if (storedToken && isIdleExpired()) {
        // Left signed in on a shared/lab computer past the idle window --
        // don't resume, treat it the same as a manual logout.
        clearAuthData();
        setIsLoading(false);
        return;
      }
      if (storedToken) {
        setToken(storedToken);
        // Try to fetch user data with the stored token
        try {
          const response = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          const raw = response.data.user;
          const normalized: UserData = {
            userId: raw.user_id,
            role: raw.role,
            firstName: raw.first_name,
            lastName: raw.last_name,
            name: `${raw.first_name} ${raw.last_name}`.trim(),
            email: raw.email,
            departmentName: raw.department_name ?? undefined,
            departmentAbbrev: raw.department_abbreviation ?? undefined,
            studentNumber: raw.student_number ?? undefined,
            course: raw.course ?? undefined,
            yearLevel: raw.year_level ?? undefined,
            employeeId: raw.employee_id ?? undefined,
            specialization: raw.specialization ?? undefined,
            position: raw.position ?? undefined,
          };
          saveAuthData(normalized, storedToken);
        } catch (error) {
          console.error("Failed to restore session:", error);
          clearAuthData(); // Clear invalid token
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, [saveAuthData, clearAuthData, isIdleExpired]);

  const login = async (emailOrSchoolId: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", {
        emailOrSchoolId: emailOrSchoolId, // Ensure key name matches backend expectation
        password,
      });
      const raw = response.data.user;
      const normalized: UserData = {
        userId: raw.user_id,
        role: raw.role,
        firstName: raw.first_name,
        lastName: raw.last_name,
        name: `${raw.first_name} ${raw.last_name}`.trim(), // ← dashboards use user.name
        email: raw.email,
        departmentName: raw.department_name ?? undefined,
        departmentAbbrev: raw.department_abbreviation ?? undefined,
        studentNumber: raw.student_number ?? undefined,
        course: raw.course ?? undefined,
        yearLevel: raw.year_level ?? undefined,
        employeeId: raw.employee_id ?? undefined,
        specialization: raw.specialization ?? undefined,
        position: raw.position ?? undefined,
      };
      saveAuthData(normalized, response.data.token);
    } catch (error) {
      console.error("Login API error:", error);
      // Handle specific error messages from backend if needed
      throw error; // Re-throw to be caught by the calling component (e.g., Login.tsx)
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    // Capture the token BEFORE clearing storage. api.js's request interceptor
    // reads the token from localStorage (about to be emptied) and runs
    // asynchronously, so it cannot re-attach it -- without passing it
    // explicitly here the /auth/logout request goes out unauthenticated and
    // the server never records the logout, leaving the JWT valid for its full
    // 24h lifetime. Also tear down the socket (mobile already does this).
    const storedToken = localStorage.getItem("oams_token");
    clearAuthData();
    disconnectSocket();
    api
      .post(
        "/auth/logout",
        null,
        storedToken
          ? { headers: { Authorization: `Bearer ${storedToken}` } }
          : undefined,
      )
      .catch((error) => console.error("Logout error:", error));
  }, [clearAuthData]);

  // Idle-timeout enforcement while the app is open: real user activity
  // (not just the tab being open) resets the clock, and it's checked
  // periodically plus whenever the tab regains visibility -- covers both
  // "walked away from an unlocked shared PC with the tab still open" and
  // "closed the tab/browser and came back later than the idle window".
  useEffect(() => {
    if (!isAuthenticated) return;

    const events: (keyof WindowEventMap)[] = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, touchLastActive));

    const checkIdle = () => {
      if (isIdleExpired()) logout();
    };
    const intervalId = window.setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkIdle();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      events.forEach((event) => window.removeEventListener(event, touchLastActive));
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, touchLastActive, isIdleExpired, logout]);

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout, isAuthenticated }),
    [user, token, isLoading, isAuthenticated, login, logout], // Include login and logout in dependency array
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
