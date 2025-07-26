import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  getAuthStatus, 
  getFiMcpStatus, 
  initiateFiMcpAuth, 
  completeFiMcpAuth, 
  disconnectFiMcp,
  updateAuthToken 
} from '../services/api';

/**
 * Authentication Context
 * Manages Firebase and Fi MCP authentication state
 */

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState({
    firebase: { authenticated: false },
    fiMcp: { authenticated: false }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use refs to prevent infinite loops
  const lastRefreshRef = useRef(0);
  const isInitializedRef = useRef(false);

  const auth = getAuth();

  // Refresh authentication status from backend with debouncing
  const refreshAuthStatus = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    
    // Prevent too frequent calls (minimum 5 seconds between calls)
    if (!force && timeSinceLastRefresh < 5000) {
      return;
    }

    try {
      setLoading(true);
      const status = await getAuthStatus();
      setAuthStatus(status);
      setError(null);
      lastRefreshRef.current = now;
    } catch (error) {
      console.error('Error refreshing auth status:', error);
      // Don't set error for rate limiting, just log it
      if (!error.message.includes('Too many requests')) {
        setError('Failed to get authentication status');
      }
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array to prevent infinite loops

  // Initialize Firebase auth state
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      
      setUser(firebaseUser);
      
      if (firebaseUser && !isInitializedRef.current) {
        try {
          // Get fresh token and update API service
          const token = await firebaseUser.getIdToken();
          updateAuthToken(token);
          
          // Get authentication status from backend (force refresh)
          await refreshAuthStatus(true);
          isInitializedRef.current = true;
        } catch (error) {
          console.error('Error updating auth token:', error);
          if (isMounted) {
            setError('Failed to authenticate with backend');
          }
        }
      } else if (!firebaseUser) {
        // User logged out
        updateAuthToken(null);
        isInitializedRef.current = false;
        if (isMounted) {
          setAuthStatus({
            firebase: { authenticated: false },
            fiMcp: { authenticated: false }
          });
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [auth]); // Only depend on auth, not refreshAuthStatus

  // Initiate Fi MCP authentication
  const startFiMcpAuth = async (phoneNumber) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await initiateFiMcpAuth(phoneNumber);
      
      // Refresh auth status after initiation
      await refreshAuthStatus(true);
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Complete Fi MCP authentication
  const finishFiMcpAuth = async (passcode) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await completeFiMcpAuth(passcode);
      
      // Refresh auth status after completion
      await refreshAuthStatus(true);
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Fi MCP
  const disconnectFiMcpAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await disconnectFiMcp();
      
      // Refresh auth status after disconnection
      await refreshAuthStatus(true);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check if user is fully authenticated (Firebase + Fi MCP)
  const isFullyAuthenticated = () => {
    return authStatus.firebase.authenticated && authStatus.fiMcp.authenticated;
  };

  // Check if user can access financial data
  const canAccessFinancialData = () => {
    return authStatus.fiMcp.authenticated;
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    authStatus,
    loading,
    error,
    isFullyAuthenticated,
    canAccessFinancialData,
    startFiMcpAuth,
    finishFiMcpAuth,
    disconnectFiMcpAuth,
    refreshAuthStatus,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 