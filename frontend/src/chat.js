// frontend/src/Chat.js
import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { sendMessage, clearChatHistory } from './services/api';
import AuthStatusCard from './components/auth/AuthStatusCard';
import FiMcpAuthModal from './components/auth/FiMcpAuthModal';
import ChatHistory from './components/chat/ChatHistory';
import ChatInput from './components/chat/ChatInput';
import MessageSuggestions from './components/chat/MessageSuggestions';

/**
 * Enhanced Chat Component
 * Integrates with backend API, authentication, and provides enhanced chat experience
 */

const Chat = () => {
  const { user, canAccessFinancialData, loading: authLoading } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFiMcpModal, setShowFiMcpModal] = useState(false);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || loading) return;

    const userMessage = {
      sender: 'user',
      text: currentMessage.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);
    setError(null);

    try {
      // Convert messages to backend format
      const chatHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Send message to backend
      const response = await sendMessage(currentMessage.trim(), chatHistory);
      
      // Add AI response to chat
      const aiMessage = {
        sender: 'ai',
        text: response.response || 'I apologize, but I couldn\'t process your request.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        sender: 'ai',
        text: error.message || 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setCurrentMessage(suggestion);
  };

  // Handle clearing chat history
  const handleClearHistory = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
      setError(null);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      setError('Failed to clear chat history');
    }
  };

  // Handle connecting Fi MCP
  const handleConnectFiMcp = () => {
    setShowFiMcpModal(true);
  };

  // Handle Fi MCP modal close
  const handleFiMcpModalClose = () => {
    setShowFiMcpModal(false);
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Authentication Status Card */}
      <AuthStatusCard onConnectFiMcp={handleConnectFiMcp} />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Container */}
      <div className="bg-white shadow-md rounded-lg p-4 border border-indigo-200">
        {/* Chat Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            💬 Financial Assistant
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearHistory}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              title="Clear chat history"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Message Suggestions */}
        <MessageSuggestions onSuggestionClick={handleSuggestionClick} />

        {/* Chat History */}
        <ChatHistory messages={messages} loading={loading} />

        {/* Chat Input */}
        <ChatInput
          message={currentMessage}
          setMessage={setCurrentMessage}
          onSend={handleSendMessage}
          loading={loading}
          disabled={!user}
        />
      </div>

      {/* Fi MCP Authentication Modal */}
      <FiMcpAuthModal 
        isOpen={showFiMcpModal} 
        onClose={handleFiMcpModalClose} 
      />
    </div>
  );
};

export default Chat;
