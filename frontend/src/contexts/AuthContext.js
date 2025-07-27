import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { 
  initiatePhoneFiMcp, 
  completePhoneFiMcp, 
  getAuthStatus 
} from '../services/api';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiMcpSession, setFiMcpSession] = useState(null);

  // Refs to prevent multiple simultaneous calls
  const lastRefreshRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Authentication state listener
  useEffect(() => {
    const auth = getAuth();
    
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(
      auth, 
      async (currentUser) => {
        try {
          setLoading(true);
          
          if (currentUser) {
            // User is signed in
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              emailVerified: currentUser.emailVerified
            });

            // Attempt to get auth status from backend
            try {
              const status = await getAuthStatus();
              
              // Update Fi MCP session if authenticated
              if (status.fiMcp.authenticated) {
                setFiMcpSession({
                  ...fiMcpSession,
                  authenticated: true
                });
              }
            } catch (authStatusError) {
              console.error('Failed to get auth status:', authStatusError);
            }
          } else {
            // User is signed out
            setUser(null);
            setFiMcpSession(null);
          }
        } catch (error) {
          console.error('Authentication state change error:', error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Store Fi MCP session in localStorage
  const storeFiMcpSession = useCallback((sessionData) => {
    try {
      localStorage.setItem('fiMcpSession', JSON.stringify(sessionData));
      setFiMcpSession(sessionData);
    } catch (error) {
      console.error('Error storing Fi MCP session:', error);
    }
  }, []);

  // Retrieve Fi MCP session from localStorage
  const retrieveFiMcpSession = useCallback(() => {
    try {
      const storedSession = localStorage.getItem('fiMcpSession');
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        setFiMcpSession(parsedSession);
        return parsedSession;
      }
    } catch (error) {
      console.error('Error retrieving Fi MCP session:', error);
    }
    return null;
  }, []);

  // Comprehensive logout method
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Firebase logout
      const auth = getAuth();
      await signOut(auth);

      // Clear authentication states
      setUser(null);
      setFiMcpSession(null);
      setError(null);

      // Clear localStorage
      localStorage.removeItem('fiMcpSession');
      
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Start Fi MCP authentication
  const startFiMcpAuth = useCallback(async (phoneNumber) => {
    try {
      setLoading(true);
      setError(null);

      const result = await initiatePhoneFiMcp(phoneNumber);
      
      if (result && result.data) {
        // Store session information
        storeFiMcpSession({
          phoneNumber,
          loginUrl: result.data.loginUrl,
          sessionId: result.data.sessionId
        });

        return result;
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [storeFiMcpSession]);

  // Complete Fi MCP authentication
  const finishFiMcpAuth = useCallback(async (passcode) => {
    try {
      setLoading(true);
      setError(null);

      const result = await completePhoneFiMcp(passcode);
      
      if (result && result.success) {
        // Update stored session
        const currentSession = retrieveFiMcpSession() || {};
        storeFiMcpSession({
          ...currentSession,
          authenticated: true
        });

        return result;
      } else {
        throw new Error('Authentication completion failed');
      }
    } catch (err) {
      setError(err.message || 'Authentication completion failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [retrieveFiMcpSession, storeFiMcpSession]);

  // Refresh authentication status
  const refreshAuthStatus = useCallback(async (force = false) => {
    // Prevent multiple simultaneous calls
    const now = Date.now();
    if (!force && lastRefreshRef.current && 
        (now - lastRefreshRef.current) < 5000) {
      return;
    }

    try {
      setLoading(true);
      lastRefreshRef.current = now;

      const status = await getAuthStatus();
      
      // Update user and Fi MCP session
      setUser(status.firebase);
      
      // If Fi MCP is authenticated, update session
      if (status.fiMcp.authenticated) {
        const currentSession = retrieveFiMcpSession() || {};
        storeFiMcpSession({
          ...currentSession,
          authenticated: true
        });
      }

      return status;
    } catch (err) {
      setError(err.message || 'Failed to refresh authentication status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [retrieveFiMcpSession, storeFiMcpSession]);

  // Provide context values
  const value = {
    user,
    loading,
    error,
    fiMcpSession,
    startFiMcpAuth,
    finishFiMcpAuth,
    refreshAuthStatus,
    logout,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 