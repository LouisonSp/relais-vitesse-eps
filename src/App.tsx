import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const TeacherDashboardPage = lazy(() => import('./pages/TeacherDashboardPage'))
const SessionPage = lazy(() => import('./pages/SessionPage'))

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)

  return (
    <Router>
      <Suspense fallback={<div className="app-loading">Chargement…</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/login/student"
            element={isAuthenticated && role === 'student' ? <Navigate to="/dashboard" /> : <LoginPage />}
          />
          <Route
            path="/dashboard"
            element={isAuthenticated && role === 'student' ? <DashboardPage /> : <Navigate to="/login/student" />}
          />
          <Route
            path="/session/:sessionId"
            element={isAuthenticated && role === 'student' ? <SessionPage /> : <Navigate to="/login/student" />}
          />

          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />

          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
