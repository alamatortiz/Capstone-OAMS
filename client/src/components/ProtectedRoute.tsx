import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles: Array<"student" | "faculty" | "admin" | "superadmin">;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a proper loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />; // Not authenticated, redirect to login
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Authenticated but unauthorized role, redirect to a generic unauthorized page or login
    return <Navigate to="/unauthorized" replace />; // Or to login with a message
  }

  return <Outlet />; // User is authenticated and authorized, render child routes
};

export default ProtectedRoute;
