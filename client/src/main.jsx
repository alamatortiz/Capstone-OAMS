import React, { Suspense } from 'react';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Login from "./pages/Login.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import StudentDashboard from "./pages/student/student_dashboard.jsx";
import QueuePage from "./pages/student/queue.jsx";

// ─── Lazy-loaded routes for better performance ───────────────────────────
const QueueStatusPage = React.lazy(() => import("./pages/student/queue-status.jsx"));
const QueueTrackingPage = React.lazy(() => import("./pages/student/queue-tracking.jsx"));
const AvailServicesPage = React.lazy(() => import("./pages/student/avail-services.jsx")); // ← NEW

import AppointmentsPage from "./pages/student/appointments.jsx";
import DocumentsPage from "./pages/student/documents.jsx";
import TransactionsPage from "./pages/student/transactions.jsx";
import ProfessorDashboard from "./pages/professor/professor_dashboard.jsx";
import AdminDashboard from "./pages/admin/admin_dashboard.jsx";
import { QueueProvider } from "./contexts/QueueProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

// ─── Loading fallback component ────────────────────────────────────────────
const LoadingFallback = () => <div>Loading...</div>;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <QueueProvider>
        <BrowserRouter>
          <Routes>
            {/* ─── Public Routes ─────────────────────────────────────────────────── */}
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />

            {/* ─── Protected Student Routes ──────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              {/* Dashboard & Core Navigation */}
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/queue" element={<QueuePage />} />

              {/* Queue Management */}
              <Route
                path="/student/queue-status"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <QueueStatusPage />
                  </Suspense>
                }
              />
              <Route
                path="/student/queue-tracking"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <QueueTrackingPage />
                  </Suspense>
                }
              />

              {/* Services - NEW ROUTE */}
              <Route
                path="/student/avail-service"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AvailServicesPage />
                  </Suspense>
                }
              />

              {/* Appointments, Documents, Transactions */}
              <Route path="/student/appointments" element={<AppointmentsPage />} />
              <Route path="/student/documents" element={<DocumentsPage />} />
              <Route path="/student/transactions" element={<TransactionsPage />} />
            </Route>

            {/* ─── Protected Faculty Routes ──────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
              <Route
                path="/professor/dashboard"
                element={<ProfessorDashboard />}
              />
            </Route>

            {/* ─── Protected Admin Routes ────────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* ─── Backward-compatible TEMP UI-testing routes (to be removed later) ─ */}
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/student-queue" element={<QueuePage />} />
            <Route
              path="/student-queue-status"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <QueueStatusPage />
                </Suspense>
              }
            />
            <Route
              path="/student-queue-tracking"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <QueueTrackingPage />
                </Suspense>
              }
            />
            <Route
              path="/student-avail-service"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AvailServicesPage />
                </Suspense>
              }
            />
            <Route path="/student-appointments" element={<AppointmentsPage />} />
            <Route path="/student-documents" element={<DocumentsPage />} />
            <Route path="/student-transactions" element={<TransactionsPage />} />
            <Route path="/professor-dashboard" element={<ProfessorDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      </QueueProvider>
    </AuthProvider>
  </StrictMode>,
);