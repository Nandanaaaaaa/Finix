import React from 'react';

const MessageBubble = ({ sender, text }) => {
  const alignment = sender === 'user' ? 'justify-end' : 'justify-start';
  const style = sender === 'user'
    ? 'bg-indigo-100 text-indigo-900'
    : 'bg-emerald-100 text-emerald-900';

  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow ${style}`}>
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;
