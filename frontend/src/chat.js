// frontend/src/Chat.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { sendMessage, getChatSuggestions } from './services/api';
import FiMcpAuthModal from './components/auth/FiMcpAuthModal';
import MessageSuggestions from './components/chat/MessageSuggestions';
import AuthStatusCard from './components/auth/AuthStatusCard';
import ChatInput from './components/chat/ChatInput';
import ChatHistory from './components/chat/ChatHistory';

const ChatPage = () => {
  const { user, fiMcpSession, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Send message handler
  const handleSendMessage = useCallback(async (message) => {
    if (!message.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Add user message to chat
      const userMessage = { 
        sender: 'user', 
        content: message, 
        timestamp: new Date().toISOString() 
      };
      setMessages(prevMessages => [...prevMessages, userMessage]);

      // Send message to backend
      const response = await sendMessage(message, messages);

      // Add AI response to chat
      const aiMessage = { 
        sender: 'ai', 
        content: response.message, 
        timestamp: new Date().toISOString(),
        functionCalled: response.functionCalled,
        data: response.data
      };
      setMessages(prevMessages => [...prevMessages, aiMessage]);

      scrollToBottom();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [messages, scrollToBottom]);

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">FiNIX</h1>
            <span className="text-sm text-gray-500">AI Financial Assistant</span>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Authentication Status Column */}
        <div className="md:col-span-1">
          <AuthStatusCard 
            onConnectFiMoney={() => setIsAuthModalOpen(true)}
          />
        </div>

        {/* Chat Column */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col">
          {/* Chat History */}
          <div className="flex-grow overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-xl mb-4">Welcome to FiNIX</p>
                <p>Start a conversation about your finances</p>
                <MessageSuggestions onSuggestionClick={handleSendMessage} />
              </div>
            ) : (
              <ChatHistory messages={messages} />
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-100 p-4">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </main>

      {/* Authentication Modal */}
      <FiMcpAuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

export default ChatPage;
