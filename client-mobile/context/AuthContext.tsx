import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import api, { setCachedToken } from "../utils/api";
import { disconnectSocket } from "../utils/socket";
import { ensureNotificationPermission } from "../utils/notifications";

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
  login: (emailOrSchoolId: string, password: string) => Promise<UserData>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Web calls this role "faculty"; mobile's route segments are named
// "professor". Keep the server's naming as the source of truth everywhere
// except here, at the boundary where a role turns into a route path.
export function getRouteRole(role: Role): "student" | "professor" | "admin" | "superadmin" {
  return role === "faculty" ? "professor" : role;
}

function normalizeUser(raw: any): UserData {
  return {
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
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  const saveAuthData = useCallback(async (nextUser: UserData, nextToken: string) => {
    await SecureStore.setItemAsync("oams_user", JSON.stringify(nextUser));
    await SecureStore.setItemAsync("oams_token", nextToken);
    setCachedToken(nextToken);
    setUser(nextUser);
    setToken(nextToken);
  }, []);

  const clearAuthData = useCallback(async () => {
    await SecureStore.deleteItemAsync("oams_user");
    await SecureStore.deleteItemAsync("oams_token");
    setCachedToken(null);
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = await SecureStore.getItemAsync("oams_token");
      if (storedToken) {
        setCachedToken(storedToken);
        try {
          const response = await api.get("/auth/me");
          await saveAuthData(normalizeUser(response.data.user), storedToken);
        } catch (error) {
          console.error("Failed to restore session:", error);
          await clearAuthData();
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, [saveAuthData, clearAuthData]);

  useEffect(() => {
    if (user) ensureNotificationPermission();
  }, [user]);

  const login = async (emailOrSchoolId: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { emailOrSchoolId, password });
      const normalized = normalizeUser(response.data.user);
      await saveAuthData(normalized, response.data.token);
      return normalized;
    } catch (error) {
      console.error("Login API error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
    disconnectSocket();
    api.post("/auth/logout").catch((error) => console.error("Logout error:", error));
  };

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout, isAuthenticated }),
    [user, token, isLoading, isAuthenticated],
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
