import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import api from "../../utils/api"; // Assuming a similar API setup to web

// Define types for better readability and structure
// Even in a .js file, JSDoc can provide type hints for IDEs and linting.
/**
 * @typedef {"student" | "faculty" | "admin"} Role
 */

/**
 * @typedef {object} UserData
 * @property {number} userId
 * @property {string} schoolId
 * @property {Role} role
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} [departmentName]
 * @property {string} [studentNumber]
 * @property {string} [course]
 * @property {number} [yearLevel]
 * @property {string} [employeeId]
 * @property {string} [specialization]
 * @property {string} [position]
 */

/**
 * @typedef {object} AuthContextValue
 * @property {UserData | null} user
 * @property {string | null} token
 * @property {boolean} isLoading
 * @property {(emailOrSchoolId: string, password: string) => Promise<void>} login
 * @property {() => void} logout
 * @property {boolean} isAuthenticated
 */

// @ts-ignore
const AuthContext =
  (createContext < AuthContextValue) | (undefined > undefined);

/**
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  /** @type {[UserData | null, React.Dispatch<React.SetStateAction<UserData | null>>]} */
  const [user, setUser] = useState(null);
  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  /**
   * @type {(user: UserData, token: string) => Promise<void>}
   */
  const saveAuthData = useCallback(async (user, token) => {
    await SecureStore.setItemAsync("oams_user", JSON.stringify(user));
    await SecureStore.setItemAsync("oams_token", token);
    setUser(user);
    setToken(token);
  }, []);

  const clearAuthData = useCallback(async () => {
    await SecureStore.deleteItemAsync("oams_user");
    await SecureStore.deleteItemAsync("oams_token");
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("oams_token");
        const storedUserRaw = await SecureStore.getItemAsync("oams_user");

        if (storedToken && storedUserRaw) {
          const storedUser = JSON.parse(storedUserRaw);
          setToken(storedToken);
          setUser(storedUser);

          // Validate token with backend
          try {
            const response = await api.get("/auth/me", {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            await saveAuthData(response.data.user, storedToken); // Refresh user data
          } catch (error) {
            console.error("Failed to restore mobile session:", error);
            await clearAuthData(); // Clear invalid token
          }
        }
      } catch (error) {
        console.error("Error initializing mobile auth:", error);
        await clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, [saveAuthData, clearAuthData]);

  /**
   * @type {(emailOrSchoolId: string, password: string) => Promise<void>}
   */
  const login = async (emailOrSchoolId, password) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", {
        emailOrSchoolId,
        password,
      });
      await saveAuthData(response.data.user, response.data.token);
    } catch (error) {
      console.error("Mobile login error:", error);
      await clearAuthData();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await clearAuthData();
    // Optionally inform backend of logout
    api
      .post("/auth/logout")
      .catch((error) => console.error("Logout error:", error));
  };

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout, isAuthenticated }),
    [user, token, isLoading, isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * @returns {AuthContextValue}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
