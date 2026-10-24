import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { theme } from '../styles/theme.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `0 ${theme.spacing.lg}`,
    height: '60px',
    backgroundColor: theme.colors.surface,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const linkStyle = {
    textDecoration: 'none',
    color: theme.colors.textMain,
    fontWeight: 'bold',
    fontSize: '1.25rem',
  };

  const btnStyle = {
    padding: '6px 12px',
    backgroundColor: isHovered ? theme.colors.border : 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    color: theme.colors.textMain,
    fontWeight: '500',
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={linkStyle}>DocChat AI</Link>
      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <span style={{ color: theme.colors.textMuted, fontSize: '0.875rem' }}>{user.email}</span>
            <button 
              style={btnStyle}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <Link to="/login" style={{ ...btnStyle, textDecoration: 'none' }}>Login</Link>
          </div>
        )}
      </div>
    </nav>
  );
}