import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, Settings, RefreshCw } from 'lucide-react';
import { getAnonymousUser, setAnonymousUserName } from '../utils/anonymousUser';

/**
 * MessageRoom component for real-time messaging
 */
function MessageRoom({ roomId, roomName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [room, setRoom] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tempUserName, setTempUserName] = useState('');
  
  const messagesEndRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { userId, userName } = getAnonymousUser();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setTempUserName(userName);
  }, [userName]);

  // Load messages when room changes
  useEffect(() => {
    if (roomId) {
      loadMessages();
      // Set up polling for new messages (we'll replace this with WebSocket later)
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [roomId]);

  const loadMessages = async () => {
    if (!roomId) return;
    
    try {
      const response = await fetch(`${backendUrl}/api/v1/messages/${roomId}`);
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(data.messages);
      setRoom(data.room);
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isLoading || !roomId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/v1/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          room_id: roomId,
          user_id: userId,
          user_name: userName
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      setNewMessage('');
      // Reload messages to show the new one
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserNameChange = () => {
    if (tempUserName.trim()) {
      setAnonymousUserName(tempUserName.trim());
      setShowSettings(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOwnMessage = (message) => message.user_id === userId;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg flex flex-col h-[650px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ←
          </button>
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">
              {roomName || room?.name || 'Loading...'}
            </h3>
            <p className="text-xs text-gray-400">
              {room?.message_count || 0} messages
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={loadMessages}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh messages"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              placeholder="Your display name"
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
            />
            <button
              onClick={handleUserNameChange}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Currently: {userName}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !error && (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}

        {error && (
          <div className="text-center text-red-400 py-4">
            <p className="text-sm">{error}</p>
            <button
              onClick={loadMessages}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                isOwnMessage(message)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              }`}
            >
              {!isOwnMessage(message) && (
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    {message.user_name || 'Anonymous'}
                  </span>
                </div>
              )}
              
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              
              <p className="text-xs opacity-75 mt-1">
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors flex items-center space-x-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default MessageRoom;
