import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
