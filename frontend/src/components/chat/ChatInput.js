import React, { useState } from 'react';

/**
 * Enhanced Chat Input Component
 * Handles message input with validation and responsive design
 */

const ChatInput = ({ message, setMessage, onSend, loading, disabled }) => {
  const [error, setError] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    
    // Validation
    if (!trimmedMessage) {
      setError('Please enter a message');
      return;
    }

    if (trimmedMessage.length > 2000) {
      setError('Message is too long (max 2000 characters)');
      return;
    }

    // Clear error and send
    setError('');
    onSend();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <div className="space-y-2">
      {/* Error Display */}
      {error && (
        <div className="text-red-600 text-sm px-2">
          {error}
        </div>
      )}

      {/* Input and Send Button */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="💬 Ask me anything about your finances..."
            className="w-full border border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:outline-none rounded-full px-4 py-2 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || disabled}
            maxLength={2000}
          />
          
          {/* Character Counter */}
          {message.length > 1500 && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
              {message.length}/2000
            </div>
          )}
        </div>

        <button 
          onClick={handleSend}
          disabled={loading || disabled || !message.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 min-w-[80px] justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Sending</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 px-2">
        Press Enter to send • Shift+Enter for new line • Max 2000 characters
      </div>
    </div>
  );
};

export default ChatInput; 