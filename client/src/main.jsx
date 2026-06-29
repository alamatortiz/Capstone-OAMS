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

const AdminDocumentsPage = React.lazy(
  () => import("./pages/admin/AdminDocuments.jsx"),
);
const AdminQueueManagement = React.lazy(
  () => import("./pages/admin/AdminQueueManagement.jsx"),
);
const AdminQueueHosting = React.lazy(
  () => import("./pages/admin/AdminQueueHosting.jsx"),
);
const AdminDocumentProcessing = React.lazy(
  () => import("./pages/admin/AdminDocumentProcessing.jsx"),
);
const AdminProfessorAvailability = React.lazy(
  () => import("./pages/admin/admin-professor-availability.jsx"),
);
const AdminScanDocument = React.lazy(
  () => import("./pages/admin/admin_scan_document.jsx"),
);
const AdminQueueAnalytics = React.lazy(
  () => import("./pages/admin/admin_queue_analytics.jsx"),
);
const AdminPinnacleSync = React.lazy(
  () => import("./pages/admin/admin_pinnacle_sync.jsx"),
);
const AdminAnnouncements = React.lazy(
  () => import("./pages/admin/admin_announcements.jsx"),
);
const AdminUserManagement = React.lazy(
  () => import("./pages/admin/admin_user_management.jsx"),
);
const AdminDataManagement = React.lazy(
  () => import("./pages/admin/admin_data_management.jsx"),
);

import AppointmentsPage from "./pages/student/stud-appointments.jsx";
import DocumentsPage from "./pages/student/stud-documents.jsx";
import TransactionsPage from "./pages/student/stud-transactions.jsx";
import ProfessorDashboard from "./pages/professor/professor_dashboard.jsx";

const ProfessorAppointmentsPage = React.lazy(
  () => import("./pages/professor/ProfessorAppointmentsPage.jsx"),
);
const ProfessorDocumentsPage = React.lazy(
  () => import("./pages/professor/ProfessorDocumentsPage.jsx"),
);
const ProfessorTransactionsPage = React.lazy(
  () => import("./pages/professor/ProfessorTransactionsPage.jsx"),
);
const ProfessorDocumentRequestPage = React.lazy(
  () => import("./pages/professor/professor_document_request.jsx"),
);
const ProfessorScheduleAvailabilityPage = React.lazy(
  () => import("./pages/professor/professor_schedule_availability.jsx"),
);

import AdminDashboard from "./pages/admin/admin_dashboard.jsx";
import AdminAppointment from "./pages/admin/AdminAppointment.jsx";
import AdminTransaction from "./pages/admin/AdminTransactions.jsx";
import AdminQueue from "./pages/admin/AdminQueue.jsx";
import { QueueProvider } from "./contexts/QueueProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { Toaster } from "sonner";

const LoadingFallback = () => <div>Loading...</div>;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <QueueProvider>
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
            </Route>

            {/* ─── Protected Faculty Routes ──────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
              <Route
                path="/professor/dashboard"
                element={<ProfessorDashboard />}
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
              {/* ★ Documents status list */}
              <Route
                path="/professor/documents"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorDocumentsPage />
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
              {/* ★ Transactions page */}
              <Route
                path="/professor/transactions"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorTransactionsPage />
                  </Suspense>
                }
              />
              {/* ★ Schedule Availability page */}
              <Route
                path="/professor/schedule-availability"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorScheduleAvailabilityPage />
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
              <Route path="/admin/queue" element={<AdminQueue />} />
              <Route
                path="/admin/documents"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDocumentsPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/queue-management"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminQueueManagement />
                  </Suspense>
                }
              />
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

            {/* ─── Backward-compatible TEMP UI-testing routes ──────────────── */}
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
              path="/student-announcements"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AnnouncementsPage />
                </Suspense>
              }
            />
            <Route
              path="/student-professor-schedules"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfessorSchedulePage />
                </Suspense>
              }
            />
            <Route
              path="/student-appointment-status"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AppointmentStatusPage />
                </Suspense>
              }
            />
            <Route path="/student-documents" element={<DocumentsPage />} />
            <Route
              path="/student-document-status"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <DocumentStatusPage />
                </Suspense>
              }
            />
            <Route
              path="/student-transactions"
              element={<TransactionsPage />}
            />
            <Route
              path="/professor-dashboard"
              element={<ProfessorDashboard />}
            />
            <Route
              path="/professor-queue"
              element={<Navigate to="/professor/appointments" replace />}
            />
            {/* ★ Backward-compatible temp route for professor appointments */}
            <Route
              path="/professor-appointments"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfessorAppointmentsPage />
                </Suspense>
              }
            />
            {/* ★ Backward-compatible temp route for professor documents */}
            <Route
              path="/professor-documents"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfessorDocumentsPage />
                </Suspense>
              }
            />
            {/* ★ Backward-compatible temp route for professor transactions */}
            <Route
              path="/professor-transactions"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfessorTransactionsPage />
                </Suspense>
              }
            />
            {/* ★ Backward-compatible temp route for professor schedule availability */}
            <Route
              path="/professor-schedule-availability"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfessorScheduleAvailabilityPage />
                </Suspense>
              }
            />
<Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route
              path="/admin-queue-management"
              element={<AdminQueueManagement />}
            />
            <Route path="/admin-appointments" element={<AdminAppointment />} />
            <Route
              path="/admin-document-processing"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDocumentProcessing />
                </Suspense>
              }
            />
            <Route
              path="/admin-professor-availability"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminProfessorAvailability />
                </Suspense>
              }
            />
            <Route
              path="/admin-announcements"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminAnnouncements />
                </Suspense>
              }
            />
            <Route
              path="/admin-user-management"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminUserManagement />
                </Suspense>
              }
            />
            <Route
              path="/admin-data-management"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDataManagement />
                </Suspense>
              }
            />
            {/* Backward-compatible temp route for scan document */}
            <Route
              path="/admin-scan-document"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminScanDocument />
                </Suspense>
              }
            />
            {/* Backward-compatible temp route for queue analytics */}
            <Route
              path="/admin-queue-analytics"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminQueueAnalytics />
                </Suspense>
              }
            />
            {/* Backward-compatible temp route for pinnacle sync */}
            <Route
              path="/admin-pinnacle-sync"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminPinnacleSync />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueueProvider>
    </AuthProvider>
  </StrictMode>,
);
