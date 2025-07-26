import React, { useRef, useEffect } from 'react';
import MessageBubble from '../MessageBubble';

/**
 * Enhanced Chat History Component
 * Displays chat messages with auto-scroll and better formatting
 */

const ChatHistory = ({ messages, loading }) => {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-[28rem] overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {/* Welcome Message */}
      {messages.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Welcome to FiNIX!
          </h3>
          <p className="text-gray-600 text-sm">
            Ask me anything about your finances. I'm here to help you understand and manage your money better.
          </p>
        </div>
      )}

      {/* Messages */}
      {messages.map((message, index) => (
        <div key={index} className="flex flex-col">
          <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[70%]">
              <MessageBubble 
                sender={message.sender} 
                text={message.text} 
              />
              {message.timestamp && (
                <div className={`text-xs text-gray-500 mt-1 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-start">
          <div className="max-w-[70%]">
            <div className="bg-emerald-100 text-emerald-900 px-4 py-2 rounded-2xl text-sm shadow">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory; 