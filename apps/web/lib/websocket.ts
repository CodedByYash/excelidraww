import { useAuthStore } from "./auth-store";
import { useState, useRef, useCallback } from "react";

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
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastMessageTimeRef = useRef<number>(0);
  const messageQueueRef = useRef<Array<{ type: String; data: any }>>([]);

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseDelay = 1000;

  const throttleDelay = 16;
  const maxMessageSize = 64 * 1024;

  const connect = useCallback(() => {
    if (!token || !roomId) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const wsUrl = `ws://localhost:8080?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(roomId)}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("websocket connected");
      setWs(websocket);
      setConnected(true);
      reconnectAttempts.current = 0;
      options.onConnect?.();

      const queue = messageQueueRef.current;
      messageQueueRef.current = [];
      queue.forEach((msg) => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify(msg));
        }
      });
    };

    websocket.onclose = (event) => {
      console.log("WebSocket disconnected", event.code, event.reason);
      setWs(null);
      setConnected(false);
      options.onDisconnect?.();

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(
          baseDelay * Math.pow(2, reconnectAttempts.current),
          30000
        );
        reconnectAttempts.current += 1;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        console.error("Max reconnection attempts reached");
      }
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
          case "pong":
            break;
        }
      } catch (error) {
        console.error("Failed to parse Websocket message", error);
      }
    };
    websocket.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    const heartbeatInterval = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: "ping" }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    websocket.addEventListener("close", () => {
      clearInterval(heartbeatInterval);
    });
  }, [token, roomId, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws) {
      ws.close();
      setWs(null);
      setConnected(false);
    }
  }, [ws]);

  const sendMessage = useCallback(
    (message: any) => {
      const messageStr = JSON.stringify(message);

      if (messageStr.length > maxMessageSize) {
        console.warn("Message too large, dropping:", messageStr.length);
        return;
      }

      if (message.type === "cursor.update") {
        const now = Date.now();
        if (now - lastMessageTimeRef.current < throttleDelay) {
          return;
        }
        lastMessageTimeRef.current = now;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        messageQueueRef.current.push(message);
      }
    },
    [ws]
  );
  return { ws, connect, connected, disconnect, sendMessage };
}
