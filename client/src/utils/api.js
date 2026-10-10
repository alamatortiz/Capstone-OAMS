import axios from "axios";
import { loginPathForRole } from "./loginPaths";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("oams_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A missing/expired JWT (authMiddleware's "Access token required" / "Invalid
// or expired token") means the session itself is dead -- without this, every
// page's own catch block just shows a generic "could not load" error with no
// indication the student needs to log in again. Deliberately excludes the
// role-mismatch 403 ("Access denied: Unauthorized role"), which is a valid,
// still-logged-in session hitting the wrong endpoint, not an expired one.
const SESSION_DEAD_MESSAGES = ["Access token required", "Invalid or expired token"];

// 502/503/504 (or no response at all -- the backend/gateway never answered)
// mean the whole system is down, not that this one request failed for its
// own reason -- unlike every other status code, no page-level toast can
// meaningfully explain that, so this takes over the whole screen with a
// dedicated status page instead. A plain 500 deliberately stays out of this
// list: that's this one action's own code throwing, which the page's
// existing toast/retry handling already covers, and the rest of the app is
// still perfectly usable.
let redirectingToErrorPage = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.error;
    const isAuthEndpoint = error?.config?.url?.includes("/auth/login");
    const hadToken = !!localStorage.getItem("oams_token");

    if (
      !isAuthEndpoint &&
      hadToken &&
      (status === 401 || status === 403) &&
      SESSION_DEAD_MESSAGES.includes(message)
    ) {
      let role = null;
      try {
        role = JSON.parse(localStorage.getItem("oams_user") || "null")?.role ?? null;
      } catch {
        role = null;
      }
      localStorage.removeItem("oams_token");
      localStorage.removeItem("oams_user");
      localStorage.removeItem("oams_last_active");
      sessionStorage.setItem("oams_session_expired", "1");
      window.location.href = loginPathForRole(role);
      return Promise.reject(error);
    }

    const isGatewayStatus = status === 502 || status === 503 || status === 504;
    const isUnreachable = !error.response && !axios.isCancel(error);

    // The user's own connection dropped -- not a system outage. Don't yank
    // them to a full-page error (which reloads and loses whatever they were
    // doing); the OfflineBanner tells them, and the failed call rejects
    // normally so the page's own error handling still runs.
    if (isUnreachable && typeof navigator !== "undefined" && navigator.onLine === false) {
      error.isOffline = true;
      return Promise.reject(error);
    }

    if (
      (isGatewayStatus || isUnreachable) &&
      !redirectingToErrorPage &&
      !window.location.pathname.startsWith("/error/")
    ) {
      redirectingToErrorPage = true;
      window.location.href = `/error/${status || 503}`;
    }

    return Promise.reject(error);
  },
);

export default api;
