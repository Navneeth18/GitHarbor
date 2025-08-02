import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, Users, Calendar } from 'lucide-react';

/**
 * RoomSelector component for choosing and creating chat rooms
 */
function RoomSelector({ onRoomSelect, selectedRoomId }) {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${backendUrl}/api/v1/rooms/`);
      if (!response.ok) {
        throw new Error(`Failed to load rooms: ${response.status}`);
      }
      
      const data = await response.json();
      setRooms(data.rooms);
      setError(null);
      
      // Auto-select first room if none selected
      if (data.rooms.length > 0 && !selectedRoomId) {
        onRoomSelect(data.rooms[0].id, data.rooms[0].name);
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    
    if (!newRoomName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${backendUrl}/api/v1/rooms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRoomName.trim(),
          description: newRoomDescription.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create room');
      }

      const newRoom = await response.json();
      
      // Reset form
      setNewRoomName('');
      setNewRoomDescription('');
      setShowCreateForm(false);
      
      // Reload rooms and select the new one
      await loadRooms();
      onRoomSelect(newRoom.id, newRoom.name);
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Chat Rooms</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Chat Rooms</h3>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Create new room"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="p-4 bg-gray-900 border-b border-gray-700">
          <form onSubmit={createRoom} className="space-y-3">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={!newRoomName.trim() || isCreating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900 border-b border-red-700 text-red-200 text-sm">
          {error}
          <button
            onClick={loadRooms}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Rooms List */}
      <div className="max-h-96 overflow-y-auto">
        {rooms.length === 0 && !error ? (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm">No rooms available</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Create the first room
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room.id, room.name)}
                className={`w-full text-left p-4 hover:bg-gray-700 transition-colors ${
                  selectedRoomId === room.id ? 'bg-gray-700 border-r-2 border-blue-400' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">
                      {room.name}
                    </h4>
                    {room.description && (
                      <p className="text-gray-400 text-sm mt-1 truncate">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{room.message_count} messages</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(room.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomSelector;
