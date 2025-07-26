import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Authentication Status Card
 * Displays Firebase and Fi MCP connection status with action buttons
 */

const AuthStatusCard = ({ onConnectFiMcp }) => {
  const { authStatus, user, disconnectFiMcpAuth, loading } = useAuth();

  const isFirebaseConnected = authStatus.firebase?.authenticated;
  const isFiMcpConnected = authStatus.fiMcp?.authenticated;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        🔐 Authentication Status
      </h3>

      <div className="space-y-4">
        {/* Firebase Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isFirebaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="font-medium text-gray-800">Firebase Authentication</p>
              <p className="text-sm text-gray-600">
                {isFirebaseConnected ? user?.email : 'Not connected'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isFirebaseConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isFirebaseConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Fi MCP Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isFiMcpConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <div>
              <p className="font-medium text-gray-800">Fi Money Connection</p>
              <p className="text-sm text-gray-600">
                {isFiMcpConnected ? 'Financial data accessible' : 'Connect to access financial data'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isFiMcpConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isFiMcpConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {!isFiMcpConnected ? (
            <button
              onClick={onConnectFiMcp}
              disabled={!isFirebaseConnected || loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>🔗</span>
              <span>Connect Fi Money</span>
            </button>
          ) : (
            <button
              onClick={disconnectFiMcpAuth}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>🔌</span>
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {/* Status Message */}
        <div className={`p-3 rounded-md text-sm ${
          isFiMcpConnected 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          <p className="font-medium">
            {isFiMcpConnected 
              ? '✅ Ready to analyze your finances!' 
              : '⚠️ Connect your Fi Money account to unlock financial insights'
            }
          </p>
          <p className="mt-1">
            {isFiMcpConnected 
              ? 'You can now ask questions about your net worth, investments, and financial portfolio.'
              : 'Once connected, you\'ll be able to ask questions about your financial data and get personalized insights.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthStatusCard; 