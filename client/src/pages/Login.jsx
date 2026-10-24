import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { theme, commonStyles } from '../styles/theme.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/'); // Go to dashboard on success
    } catch (err) {
      // Axios puts server responses in err.response.data
      setError(err.response?.data?.error || 'Login failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pageStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 60px)', // Minus navbar height
  };

  return (
    <div style={pageStyle}>
      <div style={commonStyles.card}>
        <h2 style={{ marginTop: 0, marginBottom: theme.spacing.lg }}>Welcome Back</h2>
        {error && <div style={commonStyles.errorText}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '0.875rem', fontWeight: 'bold' }}>Email</label>
          <input 
            type="email" 
            style={commonStyles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: '0.875rem', fontWeight: 'bold' }}>Password</label>
          <input 
            type="password" 
            style={commonStyles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button 
            type="submit" 
            style={commonStyles.button(isHovered, isLoading)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={{ marginTop: theme.spacing.md, textAlign: 'center', fontSize: '0.875rem', color: theme.colors.textMuted }}>
          Don't have an account? <Link to="/register" style={{ color: theme.colors.primary, textDecoration: 'none' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}