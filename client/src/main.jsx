import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Login from './pages/Login.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import StudentDashboard from './pages/student/student_dashboard.jsx'
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

            {/* Backward-compatible TEMP UI-testing route */}
            <Route path="/student-dashboard" element={<StudentDashboard />} />
          </Routes>
          </BrowserRouter>
      </QueueProvider>
    </AuthProvider>
  </StrictMode>
)


