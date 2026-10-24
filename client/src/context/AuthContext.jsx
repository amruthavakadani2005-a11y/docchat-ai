import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On initial load, check if the user has a valid session cookie
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data); // data.data because our backend nests it: { success: true, data: { id, email } }
    } catch (error) {
        // Log the error to satisfy the linter
        console.error("No active session:", error); 
        setUser(null);
      } finally {
        setLoading(false); // Finished checking
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.data);
  };

  const register = async (email, password) => {
    const { data } = await api.post('/auth/register', { email, password });
    setUser(data.data);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);