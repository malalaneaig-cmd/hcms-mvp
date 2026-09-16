import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LoginPage        from './pages/LoginPage.jsx';
import DashboardPage    from './pages/DashboardPage.jsx';
import PatientsPage     from './pages/PatientsPage.jsx';
import PatientDetailPage from './pages/PatientDetailPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import DoctorsPage      from './pages/DoctorsPage.jsx';
import InvoicesPage     from './pages/InvoicesPage.jsx';
import StaffPage        from './pages/StaffPage.jsx';
import PublicBookingPage from './pages/PublicBookingPage.jsx';
import ConversationsPage from './pages/ConversationsPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/book"  element={<PublicBookingPage />} />

      {/* Authenticated */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/"             element={<DashboardPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/patients"     element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/doctors"      element={<DoctorsPage />} />
        <Route path="/invoices"     element={<InvoicesPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/staff"        element={<StaffPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
