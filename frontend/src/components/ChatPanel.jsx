import React, { useState } from 'react';
import { Send, Bot, User, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * ChatPanel component for interactive AI conversations about the project
 * Handles question submission and displays chat history with sources
 */
function ChatPanel({ projectId }) {
  const { makeAuthenticatedRequest } = useAuth();
  
  // State for chat messages, input, and loading
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Backend URL from environment variables
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  /**
   * Handle form submission to ask a question
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    // Add user message to chat history
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and show loading
    const currentQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`${backendUrl}/api/v1/chat/ask`, {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          question: currentQuestion
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please login again.');
        }
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const data = await response.json();

      // Add debugging to see what we're actually receiving
      console.log('Chat response data:', data);
      console.log('Response answer:', data.answer);
      console.log('Response sources:', data.sources);

      // Add AI response to chat history
      const aiMessage = {
        type: 'ai',
        content: data.answer || 'Sorry, I could not generate an answer.',
        sources: data.sources || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error asking question:', err);
      setError(err.message || 'Failed to get response. Please try again.');
      
      // Add error message to chat
      const errorMessage = {
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg flex flex-col h-[calc(100vh-12rem)] max-h-[600px] min-h-[400px] ml-4">
      {/* Chat header */}
      <div className="flex items-center space-x-2 p-4 border-b border-gray-700">
        <Bot className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">AI Chat</h3>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm">Ask me anything about this project!</p>
            <p className="text-xs mt-1">Try: "What is this project about?" or "How do I get started?"</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : message.type === 'error'
                ? 'bg-red-900 border border-red-700 text-red-200'
                : 'bg-gray-700 text-gray-200'
            }`}>
              {/* Message header with icon and timestamp */}
              <div className="flex items-center space-x-2 mb-2">
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                <span className="text-xs opacity-75">
                  {formatTime(message.timestamp)}
                </span>
              </div>

              {/* Message content */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>

              {/* Sources (for AI messages) */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400 mb-2">Sources:</p>
                  <div className="space-y-1">
                    {message.sources.map((source, sourceIndex) => (
                      <a
                        key={sourceIndex}
                        href={source.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-xs text-blue-300 hover:text-blue-200 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">
                          {source.source}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-200 rounded-lg p-3 max-w-[85%]">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Kortex is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <div className="p-4 border-t border-gray-700">
        {error && (
          <div className="mb-3 p-2 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this project..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors flex items-center space-x-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPanel;