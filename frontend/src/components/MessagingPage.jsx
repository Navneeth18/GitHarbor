import React, { useState } from 'react';
import RoomSelector from './RoomSelector';
import MessageRoom from './MessageRoom';

/**
 * Main messaging page that combines room selection and messaging
 */
function MessagingPage({ onBack }) {
  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleRoomSelect = (roomId, roomName) => {
    setSelectedRoom({ id: roomId, name: roomName });
  };

  const handleBackToRooms = () => {
    setSelectedRoom(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Messaging</h1>
          <p className="text-gray-400 mt-1">
            Chat with others anonymously - no login required
          </p>
        </div>
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          ← Back to Home
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Selector - Always visible on desktop, hidden on mobile when room selected */}
        <div className={`lg:col-span-1 ${selectedRoom ? 'hidden lg:block' : ''}`}>
          <RoomSelector
            onRoomSelect={handleRoomSelect}
            selectedRoomId={selectedRoom?.id}
          />
        </div>

        {/* Message Room - Takes full width on mobile when selected */}
        <div className={`lg:col-span-2 ${!selectedRoom ? 'hidden lg:block' : ''}`}>
          {selectedRoom ? (
            <MessageRoom
              roomId={selectedRoom.id}
              roomName={selectedRoom.name}
              onBack={handleBackToRooms}
            />
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center h-[650px]">
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">
                  Select a room to start chatting
                </h3>
                <p className="text-sm">
                  Choose a room from the sidebar or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessagingPage;
