"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../../lib/auth-store";
import { useRoomsStore } from "../../lib/rooms-store";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, clearAuth } = useAuthStore();
  const { rooms, loading, error, createRoom, fetchRooms } = useRoomsStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setCreating(true);
    try {
      const newRoom = await createRoom(roomName.trim());
      if (newRoom) {
        setRoomName("");
        setShowCreateForm(false);
        router.push(`/board/${newRoom.id}`);
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className=" bg-white-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Excelidraw</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={clearAuth}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Rooms</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create Room
            </button>
          </div>

          {showCreateForm && (
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
              <form onSubmit={handleCreateRoom} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No rooms yet. Create your first room to get started!
              <div className="mt-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create Room
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/board/${room.id}`)}
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {(room.slug || "").replace(/-/g, " ")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {room.adminId === user?.id ? "Admin" : "Member"}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/board/${room.id}`);
                      }}
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                    >
                      Open
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const link = `${window.location.origin}/board/${room.id}`;
                        try {
                          await navigator.clipboard.writeText(link);
                        } catch {
                          prompt("Copy link", link);
                        }
                      }}
                      className="px-3 py-1 rounded bg-gray-100 text-gray-800 text-sm hover:bg-gray-200"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
