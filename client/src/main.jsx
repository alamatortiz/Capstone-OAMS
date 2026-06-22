import React, { Suspense } from "react";
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
const QueueStatusPage = React.lazy(
  () => import("./pages/student/queue-status.jsx"),
);
const QueueTrackingPage = React.lazy(
  () => import("./pages/student/queue-tracking.jsx"),
);
const AvailServicesPage = React.lazy(
  () => import("./pages/student/avail-services.jsx"),
);
const AnnouncementsPage = React.lazy(
  () => import("./pages/student/announcements.jsx"),
);
const ProfessorSchedulePage = React.lazy(
  () => import("./pages/student/ProfessorSchedule.jsx"),
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

const AdminAnnouncements = React.lazy(
  () => import("./pages/admin/admin_announcements.jsx"),
);

// ★ NEW — Admin User Management
const AdminUserManagement = React.lazy(
  () => import("./pages/admin/admin_user_management.jsx"),
);

import AppointmentsPage from "./pages/student/appointments.jsx";

import DocumentsPage from "./pages/student/documents.jsx";
import TransactionsPage from "./pages/student/transactions.jsx";
import AppointmentBookingPage from "./pages/student/appointment-booking.jsx";
import ProfessorDashboard from "./pages/professor/professor_dashboard.jsx";

import ProfessorQueue from "./pages/professor/ProfessorQueue.jsx";
import AdminDashboard from "./pages/admin/admin_dashboard.jsx";
import AdminAppointment from "./pages/admin/AdminAppointment.jsx";
import AdminTransaction from "./pages/admin/AdminTransactions.jsx";
import AdminQueue from "./pages/admin/AdminQueue.jsx";
import { QueueProvider } from "./contexts/QueueProvider.jsx";

import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { Toaster } from "sonner";

// ─── Loading fallback component ────────────────────────────────────────────
const LoadingFallback = () => <div>Loading...</div>;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Toaster richColors position="top-right" />
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

              {/* Services */}
              <Route
                path="/student/avail-service"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AvailServicesPage />
                  </Suspense>
                }
              />

              {/* Announcements */}
              <Route
                path="/student/announcements"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AnnouncementsPage />
                  </Suspense>
                }
              />

              {/* Professor Schedules */}
              <Route
                path="/student/professor-schedules"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ProfessorSchedulePage />
                  </Suspense>
                }
              />

              {/* Appointments, Booking, Documents, Transactions */}
              <Route
                path="/student/appointments"
                element={<AppointmentsPage />}
              />
              <Route
                path="/student/appointment-booking"
                element={<AppointmentBookingPage />}
              />
              <Route path="/student/documents" element={<DocumentsPage />} />
              <Route
                path="/student/transactions"
                element={<TransactionsPage />}
              />
            </Route>

            {/* ─── Protected Faculty Routes ──────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
              <Route
                path="/professor/dashboard"
                element={<ProfessorDashboard />}
              />
              <Route path="/professor/queue" element={<ProfessorQueue />} />
            </Route>

            {/* ─── Protected Admin Routes ────────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />

              <Route
                path="/admin/queue"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminQueue />
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
                path="/admin/appointments"
                element={<AdminAppointment />}
              />

              <Route
                path="/admin/documents"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDocumentsPage />
                  </Suspense>
                }
              />

              {/* Admin Document Processing Route */}
              <Route
                path="/admin/document-processing"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDocumentProcessing />
                  </Suspense>
                }
              />

              {/* Admin Professor (Faculty) Availability Route */}
              <Route
                path="/admin/professor-availability"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminProfessorAvailability />
                  </Suspense>
                }
              />

              <Route
                path="/admin/transactions"
                element={<AdminTransaction />}
              />

              {/* Admin Announcements Route */}
              <Route
                path="/admin/announcements"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminAnnouncements />
                  </Suspense>
                }
              />

              {/* ★ NEW — Admin User Management Route */}
              <Route
                path="/admin/user-management"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminUserManagement />
                  </Suspense>
                }
              />
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
              path="/student-appointments"
              element={<AppointmentsPage />}
            />
            <Route
              path="/student-appointment-booking"
              element={<AppointmentBookingPage />}
            />
            <Route path="/student-documents" element={<DocumentsPage />} />
            <Route
              path="/student-transactions"
              element={<TransactionsPage />}
            />
            <Route
              path="/professor-dashboard"
              element={<ProfessorDashboard />}
            />
            <Route path="/professor-queue" element={<ProfessorQueue />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route
              path="/admin-queue-management"
              element={<AdminQueueManagement />}
            />
            <Route path="/admin-appointments" element={<AdminAppointment />} />
            {/* Backward-compatible temp route for document processing */}
            <Route
              path="/admin-document-processing"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDocumentProcessing />
                </Suspense>
              }
            />
            {/* Backward-compatible temp route for professor availability */}
            <Route
              path="/admin-professor-availability"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminProfessorAvailability />
                </Suspense>
              }
            />
            {/* Backward-compatible temp route for announcements */}
            <Route
              path="/admin-announcements"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminAnnouncements />
                </Suspense>
              }
            />
            {/* ★ NEW — Backward-compatible temp route for user management */}
            <Route
              path="/admin-user-management"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <AdminUserManagement />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueueProvider>
    </AuthProvider>
  </StrictMode>,
);