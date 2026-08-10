// Mirrors the TYPE_PATHS maps duplicated across client/src/components/*Sidebar.jsx
// and client/src/pages/*/[role]-notifications.jsx -- click-to-source always lands
// on the role's list/status screen for that category, never a specific record.
export type NotificationType = 'queue' | 'document' | 'appointment' | 'announcement';

export const STUDENT_NOTIFICATION_PATHS: Record<NotificationType, string> = {
  queue: '/pages/student/student_queue_status',
  document: '/pages/student/student_document_status',
  appointment: '/pages/student/student_appointment_status',
  announcement: '/pages/student/student_announcement',
};
export const STUDENT_NOTIFICATIONS_VIEW_ALL = '/pages/student/student_notifications';

// Professor has no dedicated queue screen, so that one falls back to the
// dashboard -- announcements now route to their own screen. Matches web's
// ProfessorSidebar.jsx NOTIFICATION_TYPE_PATHS.
export const PROFESSOR_NOTIFICATION_PATHS: Record<NotificationType, string> = {
  queue: '/pages/professor/professor_dashboard',
  document: '/pages/professor/professor_documents_status',
  appointment: '/pages/professor/professor_appointment',
  announcement: '/pages/professor/professor_announcement',
};
export const PROFESSOR_NOTIFICATIONS_VIEW_ALL = '/pages/professor/professor_notifications';

export const ADMIN_NOTIFICATION_PATHS: Record<NotificationType, string> = {
  queue: '/pages/admin/admin_queue',
  document: '/pages/admin/admin_document_processing',
  appointment: '/pages/admin/admin_appointment',
  announcement: '/pages/admin/admin_announcement',
};
export const ADMIN_NOTIFICATIONS_VIEW_ALL = '/pages/admin/admin_notifications';

// Matches web's TYPE_META (client/src/pages/*/[role]-notifications.jsx) --
// same icon choice (Clock/FileText/Calendar/Megaphone) and same gradient
// base colors (see stud-notifications.css .notif-icon-*).
export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; icon: string; color: string }
> = {
  queue: { label: 'Queue', icon: 'time-outline', color: '#3b82f6' },
  document: { label: 'Document', icon: 'document-text-outline', color: '#f59e0b' },
  appointment: { label: 'Appointment', icon: 'calendar-outline', color: '#a855f7' },
  announcement: { label: 'Announcement', icon: 'megaphone-outline', color: '#ec4899' },
};
