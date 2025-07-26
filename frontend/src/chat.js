// frontend/src/Chat.js
import React, { useState } from 'react';
import axios from 'axios';

const Chat = ({ user }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;
    const newHistory = [...chatHistory, { sender: 'user', text: currentMessage }];
    setChatHistory(newHistory);
    setCurrentMessage('');
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chat`,
        { message: currentMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const aiReply = response.data.reply || 'No response';
      setChatHistory([...newHistory, { sender: 'ai', text: aiReply }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory([...newHistory, { sender: 'ai', text: 'Error processing your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 max-w-4xl mx-auto mt-4 border border-indigo-200">
      <div className="h-[28rem] overflow-y-scroll border rounded p-4 mb-4 bg-gray-50 space-y-3">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow ${msg.sender === 'user' ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <p className="text-center text-sm text-gray-500 italic animate-pulse">Thinking...</p>}
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          className="flex-1 border border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:outline-none rounded-full px-4 py-2"
          placeholder="💬 Ask me anything about your finances..."
        />
        <button onClick={sendMessage} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-medium">Send</button>
      </div>
    </div>
  );
};

export default Chat;
