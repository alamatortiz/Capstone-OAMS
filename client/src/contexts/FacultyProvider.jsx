import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../utils/socket";

// Opens the shared socket connection for faculty sessions. Disconnect-on-logout
// is already handled globally by QueueProvider's own effect (unconditional on
// role), so this only needs to connect.
export function FacultyProvider({ children }) {
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user?.userId || user.role !== "faculty" || !token) return;
    connectSocket(token);
  }, [user, token]);

  return children;
}
