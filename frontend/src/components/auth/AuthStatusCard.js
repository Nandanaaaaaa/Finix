import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthStatusCard = ({ onConnectFiMoney }) => {
  const { user, fiMcpSession } = useAuth();

  // Determine authentication status
  const isFirebaseAuthenticated = !!user;
  const isFiMcpAuthenticated = fiMcpSession?.authenticated;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-6">
      {/* Authentication Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg 
            className="w-6 h-6 mr-2 text-indigo-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
            />
          </svg>
          Authentication Status
        </h3>
      </div>

      {/* Authentication Details */}
      <div className="space-y-4">
        {/* Firebase Authentication */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isFirebaseAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm font-medium text-gray-700">Firebase</span>
          </div>
          <span className="text-sm text-gray-500">
            {isFirebaseAuthenticated ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Fi MCP Authentication */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isFiMcpAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm font-medium text-gray-700">Fi Money</span>
          </div>
          <span className="text-sm text-gray-500">
            {isFiMcpAuthenticated ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Connect Fi Money Button */}
      {!isFiMcpAuthenticated && (
        <div className="pt-4 border-t border-gray-100">
          <button 
            onClick={onConnectFiMoney}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" 
              />
            </svg>
            <span>Connect Fi Money</span>
          </button>
        </div>
      )}

      {/* User Info */}
      {isFirebaseAuthenticated && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover" 
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                {user.email ? user.email[0].toUpperCase() : '👤'}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user.displayName || user.email}
              </p>
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthStatusCard; 