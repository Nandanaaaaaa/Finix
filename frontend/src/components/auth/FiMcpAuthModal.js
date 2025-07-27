import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { checkBackendHealth, queryFiMcpData, checkMcpServerStatus } from '../../services/api';

/**
 * Fi MCP Authentication Modal
 * Handles the complete Fi MCP authentication flow using the Fi MCP Development Server
 */

const FiMcpAuthModal = ({ isOpen, onClose }) => {
  const { 
    startFiMcpAuth, 
    finishFiMcpAuth, 
    loading, 
    error, 
    clearError, 
    fiMcpSession 
  } = useAuth();
  
  const [step, setStep] = useState('phone'); // 'phone', 'login', or 'complete'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [localError, setLocalError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');

  // Ref for tracking login window
  const loginWindowRef = useRef(null);

  // Sync session data from context
  useEffect(() => {
    if (fiMcpSession) {
      setPhoneNumber(fiMcpSession.phoneNumber || '');
      setLoginUrl(fiMcpSession.loginUrl || '');
      setSessionId(fiMcpSession.sessionId || '');

      // Auto-transition to login step if session exists
      if (fiMcpSession.loginUrl && step === 'phone') {
        setStep('login');
      }
    }
  }, [fiMcpSession, step]);

  // Query stored data function
  const handleQueryData = async () => {
    try {
      console.log('=== QUERYING STORED DATA ===');
      const result = await queryFiMcpData();
      console.log('Query result:', result);
    } catch (error) {
      console.error('Query failed:', error);
    }
  };

  // Check MCP server status function
  const handleCheckMcpStatus = async () => {
    try {
      console.log('=== CHECKING MCP SERVER STATUS ===');
      const result = await checkMcpServerStatus();
      console.log('MCP Server Status:', result);
    } catch (error) {
      console.error('MCP Status check failed:', error);
    }
  };

  // Automatically open login URL when it's available
  useEffect(() => {
    if (step === 'login' && loginUrl) {
      console.log('Attempting to open login URL:', loginUrl);
      
      // Close any existing login window
      if (loginWindowRef.current && !loginWindowRef.current.closed) {
        loginWindowRef.current.close();
      }

      // Open new login window
      loginWindowRef.current = window.open(loginUrl, '_blank', 'width=600,height=600');
      
      if (!loginWindowRef.current) {
        console.warn('Popup blocked. Please allow popups for this site.');
        setLocalError('Popup blocked. Please allow popups and try again.');
      }
    }

    // Cleanup function to close window if modal is closed
    return () => {
      if (loginWindowRef.current && !loginWindowRef.current.closed) {
        loginWindowRef.current.close();
      }
    };
  }, [step, loginUrl]);

  // Check backend health when modal opens
  useEffect(() => {
    if (isOpen && backendStatus === 'checking') {
      checkBackendHealth()
        .then(() => {
          setBackendStatus('connected');
        })
        .catch((error) => {
          setBackendStatus('error');
          setLocalError('Backend server is not accessible. Please ensure the backend is running.');
        });
    }
  }, [isOpen, backendStatus]);

  // Handle phone number submission
  const handlePhoneSubmit = useCallback(async (e) => {
    e.preventDefault(); // Prevent form submission and page refresh
    
    if (!phoneNumber.trim()) {
      setLocalError('Please enter your phone number');
      return;
    }

    try {
      setLocalError('');
      clearError();
      
      const result = await startFiMcpAuth(phoneNumber);
      console.log('Phone submission result:', result);
      
      if (result && result.data) {
        console.log('Setting login URL:', result.data.loginUrl);
        setLoginUrl(result.data.loginUrl);
        setSessionId(result.data.sessionId);
        console.log('Moving to login step...');
        setStep('login');
        console.log('Step should now be login');
      } else {
        console.log('Invalid result structure:', result);
        setLocalError('Invalid response from server');
      }
    } catch (error) {
      console.error('Phone submission error:', error);
      setLocalError(error.message || 'Failed to initiate authentication');
    }
  }, [phoneNumber, startFiMcpAuth, clearError]);

  // Handle authentication completion
  const handleCompleteAuth = useCallback(async () => {
    try {
      setLocalError('');
      clearError();
      
      // Use a dummy passcode since the MCP server handles the actual authentication
      await finishFiMcpAuth('123456');
      onClose();
      
      // Reset form
      setStep('phone');
      setPhoneNumber('');
      setLoginUrl('');
      setSessionId('');
    } catch (error) {
      setLocalError(error.message);
    }
  }, [finishFiMcpAuth, clearError, onClose]);

  // Handle manual login URL open
  const handleManualLoginOpen = () => {
    if (loginUrl) {
      window.open(loginUrl, '_blank');
    }
  };

  // Handle modal close
  const handleClose = () => {
    setStep('phone');
    setPhoneNumber('');
    setLoginUrl('');
    setSessionId('');
    setLocalError('');
    clearError();
    onClose();
  };

  // Reset to phone step
  const handleBackToPhone = () => {
    setStep('phone');
    setLoginUrl('');
    setSessionId('');
    setLocalError('');
    clearError();
  };

  if (!isOpen) return null;

  const currentError = localError || error;
  
  console.log('Modal render - Current step:', step, 'Login URL:', loginUrl, 'Session ID:', sessionId);

  return (
    <div key="fi-mcp-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              🔗 Connect Fi Money
            </h2>
            {backendStatus === 'checking' && (
              <div className="flex items-center space-x-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="text-xs text-blue-600">Checking backend...</span>
              </div>
            )}
            {backendStatus === 'connected' && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">Backend connected</span>
              </div>
            )}
            {backendStatus === 'error' && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-xs text-red-600">Backend error</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleQueryData}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Query stored data"
            >
              🔍 Query
            </button>
            <button
              onClick={handleCheckMcpStatus}
              className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              title="Check MCP Server Status"
            >
              🛠️ MCP Status
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Phone Number Step */}
        {step === 'phone' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Enter Your Fi Money Phone Number
              </h3>
              <p className="text-sm text-gray-600">
                We'll use this to validate your Fi Money account and provide authentication instructions.
              </p>
            </div>

            <form id="phone-form" onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                  required
                />
              </div>

              {currentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{currentError}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !phoneNumber.trim() || backendStatus === 'error'}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validating...
                    </div>
                  ) : backendStatus === 'error' ? (
                    'Backend Unavailable'
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Login Step */}
        {step === 'login' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Complete Authentication on Fi MCP Server
              </h3>
              
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Follow these steps:</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>1. Click the login link below</p>
                      <p>2. Enter your phone number: <strong>{phoneNumber}</strong></p>
                      <p>3. Use any OTP (e.g., <strong>123456</strong>)</p>
                      <p>4. Return here and click "Complete Authentication"</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Phone: <span className="font-medium">{phoneNumber}</span>
              </p>

              {/* Login Link */}
              <div className="mb-4 flex space-x-3">
                <button
                  onClick={handleManualLoginOpen}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Login Page
                </button>
              </div>
            </div>

            {currentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                <p className="text-sm text-red-700">{currentError}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteAuth}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </div>
                ) : (
                  'Complete Authentication'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiMcpAuthModal; 