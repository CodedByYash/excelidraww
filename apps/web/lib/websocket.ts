import { useAuthStore } from "./auth-store";
import { useState } from "react";

interface WebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onPresenceJoin?: (userId: string) => void;
  onPresenceLeave?: (userId: string) => void;
  onCursorUpdate?: (userId: string, x: number, y: number) => void;
}

export function useWebSocket(roomId: string, options: WebSocketOptions = {}) {
  const { token } = useAuthStore();
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = () => {
    if (!token || !roomId) return;

    const wsUrl = `ws://localhost:8080?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(roomId)}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setWs(websocket);
      options.onConnect?.();
    };

    websocket.onclose = () => {
      setWs(null);
      options.onDisconnect?.();
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "presence.join":
            options.onPresenceJoin?.(message.userId);
            break;
          case "presence.leave":
            options.onPresenceLeave?.(message.userId);
            break;
          case "cursor.update":
            options.onCursorUpdate?.(message.userId, message.x, message.y);
            break;
        }
      } catch (error) {
        console.error("Failed to parse Websocket message", error);
      }
    };
    websocket.onerror = (error) => {
      console.error("WebSocket error", error);
    };
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };
  return { ws, connect, disconnect };
}
