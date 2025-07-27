// frontend/src/App.js
import React from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ChatPage from './chat';
import BackendStatus from './components/ui/BackendStatus';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
initializeApp(firebaseConfig);

// Wrapper component to use AuthContext hooks
const AppContent = () => {
  const { user, loading, logout } = useAuth();

  // Show loading screen
  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-2">💰 FiNIX</h1>
          <p className="text-white/80">Loading your financial assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 overflow-hidden">
      {/* Backend Status Indicator */}
      <BackendStatus />
      
      {/* Floating Coins */}
      <canvas 
        id="coins" 
        className="fixed inset-0 z-0"
        style={{ pointerEvents: 'none' }}
      ></canvas>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {!user ? (
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-md w-full space-y-8 bg-white shadow-xl rounded-xl p-8 text-center">
              <h1 className="text-4xl font-extrabold text-indigo-800">💰 FiNIX</h1>
              <p className="text-gray-600 mb-6">Talk to Your Money: Your AI Financial Assistant</p>
              
              <button
                onClick={() => {
                  const provider = new GoogleAuthProvider();
                  const auth = getAuth();
                  signInWithPopup(auth, provider).catch(console.error);
                }}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center space-x-2"
              >
                <svg 
                  className="w-6 h-6" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 48 48" 
                  width="48px" 
                  height="48px"
                >
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                <span>Login with Google</span>
              </button>
              
              <p className="text-xs text-gray-500 mt-4">
                🔒 Secure login powered by Google
              </p>
            </div>
          </div>
        ) : (
          <ChatPage />
        )}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;