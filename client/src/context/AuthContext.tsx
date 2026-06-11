import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../utils/api";

type Role = "student" | "faculty" | "admin";

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

  const saveAuthData = useCallback((user: UserData, token: string) => {
    sessionStorage.setItem("oams_user", JSON.stringify(user));
    sessionStorage.setItem("oams_token", token);
    setUser(user);
    setToken(token);
  }, []);

  const clearAuthData = useCallback(() => {
    sessionStorage.removeItem("oams_user");
    sessionStorage.removeItem("oams_token");
    setUser(null);
    setToken(null);
  }, []);

  // On app load, check for existing token and fetch user data
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = sessionStorage.getItem("oams_token");
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
            name: `${raw.first_name} ${raw.last_name}`,
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
  }, [saveAuthData, clearAuthData]);

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
        name: `${raw.first_name} ${raw.last_name}`, // ← dashboards use user.name
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

  const logout = () => {
    clearAuthData();
    // Optionally, inform the backend about logout if session management is needed there
    api
      .post("/auth/logout")
      .catch((error) => console.error("Logout error:", error));
  };

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
