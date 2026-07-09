import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Reads from client-mobile/.env (EXPO_PUBLIC_* vars are inlined at build time
// by Expo's env support — no extra config needed on SDK 49+).
// Falls back to localhost only for the rare case of running the Android
// emulator's special host alias or testing directly on the same machine
// as the Metro bundler.
const baseURL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL,
  timeout: 10000,
});

// Attach the stored auth token (if any) to every outgoing request.
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("oams_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Failed to attach auth token:", error);
  }
  return config;
});

export default api;
