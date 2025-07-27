import React, { useState, useEffect } from 'react';
import { checkBackendHealth } from '../../services/api';

/**
 * Backend Status Component
 * Shows backend connection status for debugging
 */

const BackendStatus = () => {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setStatus('checking');
        const health = await checkBackendHealth();
        setStatus('connected');
        setError(null);
        console.log('Backend health:', health);
      } catch (error) {
        setStatus('error');
        setError(error.message);
        console.error('Backend connection error:', error);
      }
    };

    checkStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        console.log('✅ Backend Connected');
        break;
      case 'error':
        console.log('❌ Backend Error');
        break;
      default:
        console.log('⏳ Checking Backend...');
    }
  };

  return (
    <div className={`fixed top-4 right-4 px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor()} z-50`}>
      <div className="flex items-center space-x-2">
        <span>{getStatusText()}</span>
        {status === 'checking' && (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
        )}
      </div>
      {error && (
        <div className="text-xs mt-1 opacity-75">
          {error}
        </div>
      )}
    </div>
  );
};

export default BackendStatus; 