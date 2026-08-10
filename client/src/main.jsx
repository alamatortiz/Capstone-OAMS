import React, { Suspense, useEffect } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import "./index.css";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import LoadingOverlay from "./components/LoadingOverlay.jsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import StudentDashboard from "./pages/student/stud-dashboard.jsx";
import QueuePage from "./pages/student/stud-queue.jsx";

// ─── Lazy-loaded routes for better performance ───────────────────────────
const QueueStatusPage = React.lazy(
  () => import("./pages/student/stud-queue-status.jsx"),
);
const DocumentStatusPage = React.lazy(
  () => import("./pages/student/stud-document-status.jsx"),
);
const AppointmentStatusPage = React.lazy(
  () => import("./pages/student/stud-appointment-status.jsx"),
);
const QueueTrackingPage = React.lazy(
  () => import("./pages/student/stud-queue-tracking.jsx"),
);
const AnnouncementsPage = React.lazy(
  () => import("./pages/student/stud-announcements.jsx"),
);
const ProfessorSchedulePage = React.lazy(
  () => import("./pages/student/stud-professor-schedules.jsx"),
);

const AdminQueueHosting = React.lazy(
  () => import("./pages/admin/adm-queue-hosting.jsx"),
);
const AdminDocumentProcessing = React.lazy(
  () => import("./pages/admin/adm-document-processing.jsx"),
);
const AdminProfessorAvailability = React.lazy(
  () => import("./pages/admin/adm-professor-availability.jsx"),
);
const AdminScanDocument = React.lazy(
  () => import("./pages/admin/adm-scan-document.jsx"),
);
const AdminQueueAnalytics = React.lazy(
  () => import("./pages/admin/adm-queue-analytics.jsx"),
);
const AdminPinnacleSync = React.lazy(
  () => import("./pages/admin/adm-pinnacle-sync.jsx"),
);
const AdminAnnouncements = React.lazy(
  () => import("./pages/admin/adm-announcements.jsx"),
);
const AdminUserManagement = React.lazy(
  () => import("./pages/admin/adm-user-management.jsx"),
);
const AdminDataManagement = React.lazy(
  () => import("./pages/admin/adm-data-management.jsx"),
);

import AppointmentsPage from "./pages/student/stud-appointments.jsx";
import DocumentsPage from "./pages/student/stud-documents.jsx";
import TransactionsPage from "./pages/student/stud-transactions.jsx";
import StudentNotifications from "./pages/student/stud-notifications.jsx";
import ProfessorDashboard from "./pages/professor/prof-dashboard.jsx";

const ProfessorAppointmentsPage = React.lazy(
  () => import("./pages/professor/prof-appointments.jsx"),
);
const ProfessorTransactionsPage = React.lazy(
  () => import("./pages/professor/prof-transactions.jsx"),
);
const ProfessorDocumentRequestPage = React.lazy(
  () => import("./pages/professor/prof-documents.jsx"),
);
const ProfessorDocumentStatusPage = React.lazy(
  () => import("./pages/professor/prof-document-status.jsx"),
);
const ProfessorScheduleManagerPage = React.lazy(
  () => import("./pages/professor/prof-schedule-manager.jsx"),
);
const ProfessorNotifications = React.lazy(
  () => import("./pages/professor/prof-notifications.jsx"),
);
const ProfessorAnnouncementsPage = React.lazy(
  () => import("./pages/professor/prof-announcements.jsx"),
);

import AdminDashboard from "./pages/admin/adm-dashboard.jsx";
import AdminAppointment from "./pages/admin/adm-appointment.jsx";
import AdminTransaction from "./pages/admin/adm-transactions.jsx";
import AdminNotifications from "./pages/admin/adm-notifications.jsx";
import AdminQueue from "./pages/admin/adm-queue.jsx";
import { QueueProvider } from "./contexts/QueueProvider.jsx";
import { FacultyProvider } from "./contexts/FacultyProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { Toaster } from "sonner";

const LoadingFallback = () => <LoadingOverlay />;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <QueueProvider>
      <FacultyProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* ─── Public Routes ─────────────────────────────────────────────── */}
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />

            {/* ─── Protected Student Routes ──────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/queue" element={<QueuePage />} />
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
              <Route
                path="/student/announcements"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AnnouncementsPage />
                  </Suspense>
                }
              />
              <Route
                path="/student/professor-schedules"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorSchedulePage />
                  </Suspense>
                }
              />
              <Route
                path="/student/appointments"
                element={<AppointmentsPage />}
              />
              <Route
                path="/student/appointment-status"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AppointmentStatusPage />
                  </Suspense>
                }
              />
              <Route path="/student/documents" element={<DocumentsPage />} />
              <Route
                path="/student/document-status"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <DocumentStatusPage />
                  </Suspense>
                }
              />
              <Route
                path="/student/transactions"
                element={<TransactionsPage />}
              />
              <Route
                path="/student/notifications"
                element={<StudentNotifications />}
              />
            </Route>

            {/* ─── Protected Faculty Routes ──────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
              <Route
                path="/professor/dashboard"
                element={<ProfessorDashboard />}
              />
              {/* ★ Announcements page */}
              <Route
                path="/professor/announcements"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorAnnouncementsPage />
                  </Suspense>
                }
              />
              <Route
                path="/professor/queue"
                element={<Navigate to="/professor/appointments" replace />}
              />
              {/* ★ Appointments page */}
              <Route
                path="/professor/appointments"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorAppointmentsPage />
                  </Suspense>
                }
              />
              {/* ★ Document request submission form */}
              <Route
                path="/professor/document-request"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorDocumentRequestPage />
                  </Suspense>
                }
              />
              {/* ★ Document request status + detail view */}
              <Route
                path="/professor/document-status"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorDocumentStatusPage />
                  </Suspense>
                }
              />
              {/* ★ Transactions page */}
              <Route
                path="/professor/transactions"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorTransactionsPage />
                  </Suspense>
                }
              />
              {/* ★ Schedule Manager page */}
              <Route
                path="/professor/schedule-manager"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorScheduleManagerPage />
                  </Suspense>
                }
              />
              {/* ★ Notifications page */}
              <Route
                path="/professor/notifications"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorNotifications />
                  </Suspense>
                }
              />
            </Route>

            {/* ─── Protected Admin Routes ────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route
                path="/admin/appointments"
                element={<AdminAppointment />}
              />
              <Route
                path="/admin/transactions"
                element={<AdminTransaction />}
              />
              <Route
                path="/admin/notifications"
                element={<AdminNotifications />}
              />
              <Route path="/admin/queue" element={<AdminQueue />} />
              <Route
                path="/admin/queue-hosting"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminQueueHosting />
                  </Suspense>
                }
              />
              <Route
                path="/admin/document-processing"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDocumentProcessing />
                  </Suspense>
                }
              />
              <Route
                path="/admin/professor-availability"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminProfessorAvailability />
                  </Suspense>
                }
              />
              <Route
                path="/admin/scan-document"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminScanDocument />
                  </Suspense>
                }
              />
              <Route
                path="/admin/queue-analytics"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminQueueAnalytics />
                  </Suspense>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminAnnouncements />
                  </Suspense>
                }
              />
              <Route
                path="/admin/user-management"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminUserManagement />
                  </Suspense>
                }
              />
              <Route
                path="/admin/data-management"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDataManagement />
                  </Suspense>
                }
              />
              <Route
                path="/admin/pinnacle-sync"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminPinnacleSync />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </FacultyProvider>
      </QueueProvider>
    </AuthProvider>
  </StrictMode>,
);