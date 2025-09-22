"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "../../../lib/auth-store";
import { useRoomsStore } from "../../../lib/rooms-store";
import { useWebSocket } from "../../../lib/websocket";
import { roomsApi } from "../../../lib/api";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { joinRoom } = useRoomsStore();
  const roomId = params.roomId as string;

  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );

  const { ws, connect, disconnect } = useWebSocket(roomId, {
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
    onPresenceJoin: (userId) => setUsers((prev) => new Set([...prev, userId])),
    onPresenceLeave: (userId) =>
      setUsers((prev) => {
        const newUsers = new Set(prev);
        newUsers.delete(userId);
        return newUsers;
      }),
    onCursorUpdate: (userId, x, y) =>
      setCursors((prev) => new Map([...prev, [userId, { x, y }]])),
  });

  const [design, setDesign] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await roomsApi.getCanvas(roomId);
        if (res.status === 200) {
          setDesign(res.data.canvas.design);
        } else {
          setDesign({ elements: [] });
        }
      } catch {
        setDesign({ elements: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !user) return;
    let cancelled = false;
    joinRoom(roomId)
      .then(() => {
        if (!cancelled) connect();
      })
      .catch((error) => {
        console.error("Failed to join room:", error);
        router.push("/dashboard");
      });
    return () => {
      cancelled = true;
      disconnect();
    };
  }, [roomId, user, disconnect, joinRoom, connect, router]);

  const designKey = useMemo(() => JSON.stringify(design), [design]);
  useEffect(() => {
    if (!design) return;
    const handle = setTimeout(async () => {
      try {
        await roomsApi.saveCanvas(roomId, design);
        setSaveError(null);
      } catch (e: any) {
        setSaveError(e.response?.data?.message || "Failed to save");
      }
    }, 1200);
    return () => clearTimeout(handle);
  }, [roomId, designKey]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (ws && connected) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ws.send(
        JSON.stringify({
          type: "cursor.update",
          x,
          y,
        })
      );
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDesign((prev: any) => {
      const next = prev ? { ...prev } : { elements: [] };
      next.elements = [...(next.elements || []), { type: "dot", x, y }];
      return next;
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6">Loading canvas...</div>;
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold">Room: {roomId}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="text-sm text-gray-600">
                {connected ? "Connected" : "Disconnected"}
              </span>
              <span className="text-sm text-gray-600">
                {users.size} user{users.size !== 1 ? "s" : ""} online
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 h-[calc(100vh-4rem)] relative">
        {saveError && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-700 px-2 py-1 rounded">
            {saveError}
          </div>
        )}

        <div
          className="w-full h-full bg-white relative cursor-crosshair"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          {!design?.elements?.length && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">🎨</div>
                <p className="text-xl">Canvas will appear here</p>
                <p className="text-sm mt-2">
                  Click to add dots (saved automatically)
                </p>
              </div>
            </div>
          )}

          {design?.elements?.map((el: any, idx: number) => (
            <div
              key={idx}
              className="absolute w-2 h-2 bg-black rounded-full"
              style={{
                left: (el.x ?? 0) - 1,
                top: (el.y ?? 0) - 1,
                zIndex: 5,
              }}
            />
          ))}

          {Array.from(cursors.entries()).map(([userId, position]) => (
            <div
              key={userId}
              className="absolute w-4 h-4 bg-blue-500 rounded-full pointer-events-none"
              style={{
                left: position.x - 8,
                top: position.y - 8,
                zIndex: 10,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
