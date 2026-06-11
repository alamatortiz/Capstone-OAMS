import axios from "axios";
import * as SecureStore from "expo-secure-store";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // Adjust for your backend URL in development/production
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("oams_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
