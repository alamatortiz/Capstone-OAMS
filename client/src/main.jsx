import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Login from "./pages/Login.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import StudentDashboard from "./pages/student/student_dashboard.jsx";
import QueuePage from "./pages/student/queue.jsx";
import AppointmentsPage from "./pages/student/appointments.jsx";
import DocumentsPage from "./pages/student/documents.jsx";
import ProfessorDashboard from "./pages/professor/professor_dashboard.jsx";
import AdminDashboard from "./pages/admin/admin_dashboard.jsx";
import { QueueProvider } from "./contexts/QueueProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <QueueProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/unauthorized"
              element={<div>Unauthorized</div>}
            />
            {/* Protected Routes */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["student", "faculty", "admin"]}
                />
              }
            >
              <Route path="/dashboard" element={<StudentDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/queue" element={<QueuePage />} />
              <Route path="/student/appointments" element={<AppointmentsPage />} />
              <Route path="/student/documents" element={<DocumentsPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
              <Route
                path="/professor/dashboard"
                element={<ProfessorDashboard />}
              />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            {/* Backward-compatible TEMP UI-testing routes, to be removed later */}
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/student-queue" element={<QueuePage />} />
            <Route path="/student-appointments" element={<AppointmentsPage />} />
            <Route path="/student-documents" element={<DocumentsPage />} />
            <Route
              path="/professor-dashboard"
              element={<ProfessorDashboard />}
            />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      </QueueProvider>
    </AuthProvider>
  </StrictMode>,
);