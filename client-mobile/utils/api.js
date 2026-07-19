import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

// SecureStore is async, but axios interceptors need to attach the header
// synchronously-ish per request. AuthContext keeps this in sync on
// login/bootstrap/logout so the interceptor never has to await storage.
let cachedToken = null;
export function setCachedToken(token) {
  cachedToken = token;
}

api.interceptors.request.use((config) => {
  if (cachedToken) {
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

// A missing/expired JWT (authMiddleware's "Access token required" / "Invalid
// or expired token") means the session itself is dead. Deliberately excludes
// the role-mismatch 403 ("Access denied: Unauthorized role"), which is a
// valid, still-logged-in session hitting the wrong endpoint, not an expired one.
const SESSION_DEAD_MESSAGES = ["Access token required", "Invalid or expired token"];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.error;
    const isAuthEndpoint = error?.config?.url?.includes("/auth/login");
    const hadToken = !!cachedToken;

    if (
      !isAuthEndpoint &&
      hadToken &&
      (status === 401 || status === 403) &&
      SESSION_DEAD_MESSAGES.includes(message)
    ) {
      cachedToken = null;
      await SecureStore.deleteItemAsync("oams_token");
      await SecureStore.deleteItemAsync("oams_user");
      router.replace("/login");
    }
    return Promise.reject(error);
  },
);

export default api;
