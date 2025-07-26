import React from 'react';

const ChatInput = ({ message, setMessage, onSend }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') onSend();
  };

  return (
    <div className="flex gap-3">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1 border border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:outline-none rounded-full px-4 py-2"
        placeholder="💬 Ask me anything about your finances..."
      />
      <button onClick={onSend} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-medium">
        Send
      </button>
    </div>
  );
};

export default ChatInput;