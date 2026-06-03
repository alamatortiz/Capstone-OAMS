import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Login from './pages/Login.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import StudentDashboard from './pages/student/student_dashboard.jsx'
import ProfessorDashboard from './pages/professor/professor_dashboard.jsx'
import AdminDashboard from './pages/admin/admin_dashboard.jsx'
import { QueueProvider } from './contexts/QueueProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <QueueProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />

            {/* Student dashboard routes */}
            <Route path="/student/dashboard" element={<StudentDashboard />} />

            {/* Professor dashboard routes */}
            <Route path="/professor/dashboard" element={<ProfessorDashboard />} />

            {/* Admin dashboard routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* Backward-compatible TEMP UI-testing routes */}
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/professor-dashboard" element={<ProfessorDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      </QueueProvider>
    </AuthProvider>
  </StrictMode>
)