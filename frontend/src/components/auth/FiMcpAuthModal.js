import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Fi MCP Authentication Modal
 * Handles the complete Fi MCP authentication flow
 */

const FiMcpAuthModal = ({ isOpen, onClose }) => {
  const { startFiMcpAuth, finishFiMcpAuth, loading, error, clearError } = useAuth();
  
  const [step, setStep] = useState('phone'); // 'phone' or 'passcode'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [authData, setAuthData] = useState(null);
  const [localError, setLocalError] = useState('');

  // Handle phone number submission
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setLocalError('Please enter your phone number');
      return;
    }

    try {
      setLocalError('');
      clearError();
      
      const result = await startFiMcpAuth(phoneNumber);
      setAuthData(result.data);
      setStep('passcode');
      
      // Open the login URL in a new tab
      if (result.data.loginUrl) {
        window.open(result.data.loginUrl, '_blank');
      }
    } catch (error) {
      setLocalError(error.message);
    }
  };

  // Handle passcode submission
  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!passcode.trim()) {
      setLocalError('Please enter the passcode');
      return;
    }

    if (passcode.length !== 6) {
      setLocalError('Passcode must be 6 digits');
      return;
    }

    try {
      setLocalError('');
      clearError();
      
      await finishFiMcpAuth(passcode);
      onClose();
      
      // Reset form
      setStep('phone');
      setPhoneNumber('');
      setPasscode('');
      setAuthData(null);
    } catch (error) {
      setLocalError(error.message);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setStep('phone');
    setPhoneNumber('');
    setPasscode('');
    setAuthData(null);
    setLocalError('');
    clearError();
    onClose();
  };

  // Reset to phone step
  const handleBackToPhone = () => {
    setStep('phone');
    setPasscode('');
    setLocalError('');
    clearError();
  };

  if (!isOpen) return null;

  const currentError = localError || error;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-indigo-800">
            {step === 'phone' ? '🔗 Connect Fi Money' : '🔐 Enter Passcode'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Error Display */}
        {currentError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {currentError}
          </div>
        )}

        {/* Phone Number Step */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Fi Money Registered Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter the phone number registered with your Fi Money account
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Passcode Step */}
        {step === 'passcode' && (
          <form onSubmit={handlePasscodeSubmit}>
            <div className="mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">📱 Follow these steps:</h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Click the authentication link (opened in new tab)</li>
                  <li>2. Enter your phone number on the Fi Money page</li>
                  <li>3. Open your Fi Money app</li>
                  <li>4. Go to Net Worth Dashboard → Talk to AI → Get Passcode</li>
                  <li>5. Copy the 6-digit passcode and enter it below</li>
                </ol>
              </div>

              <label className="block text-gray-700 text-sm font-bold mb-2">
                6-Digit Passcode
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg tracking-widest"
                disabled={loading}
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter the 6-digit passcode from your Fi Money app
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackToPhone}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Complete'}
              </button>
            </div>
          </form>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                {step === 'phone' ? 'Initiating authentication...' : 'Verifying passcode...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FiMcpAuthModal; 