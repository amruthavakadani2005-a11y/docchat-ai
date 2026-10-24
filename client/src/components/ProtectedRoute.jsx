import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { theme } from '../styles/theme.js';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px', color: theme.colors.textMuted }}>
        Loading session...
      </div>
    );
  }

  // If no user is logged in, kick them to the login screen
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the requested component
  return children;
}