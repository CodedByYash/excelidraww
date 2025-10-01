import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import prisma from "@repo/db/client";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  roomId?: string;
  email?: string;
}

const wss = new WebSocketServer({ port: 8080 });

const roomConnections = new Map<string, Set<any>>();

wss.on("connection", async (ws: ExtendedWebSocket, req) => {
  try {
    const url = new URL(req.url!, `http://localhost:8080`);
    const token = url.searchParams.get("token");
    const roomId = url.searchParams.get("roomId");

    if (!token || !roomId) {
      ws.close(1008, "Missing token or roomId");
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    ws.userId = decoded.userId;
    ws.roomId = roomId;
    ws.email = decoded.email;

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [
          { adminId: decoded.userId },
          { users: { some: { id: decoded.userId } } },
        ],
      },
      select: { id: true },
    });

    if (!room) {
      ws.close(1008, "Not authorized for this room");
      return;
    }

    if (!roomConnections.has(roomId)) {
      roomConnections.set(roomId, new Set());
    }
    roomConnections.get(roomId)!.add(ws);

    broadcastToRoom(
      roomId,
      {
        type: "presence.join",
        userId: decoded.userId,
        email: decoded.email,
      },
      ws
    );

    ws.on("close", () => {
      roomConnections.get(roomId)?.delete(ws);
      broadcastToRoom(roomId, {
        type: "presence.leave",
        userId: decoded.userId,
      });
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error("Invalid message format:", error);
      }
    });
  } catch (error) {
    console.error("Connection error:", error);
    ws.close(1008, "Invalid token");
  }
});

function broadcastToRoom(
  roomId: string,
  message: any,
  exclude?: ExtendedWebSocket
) {
  const connections = roomConnections.get(roomId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);
  connections.forEach((connection) => {
    if (connection !== exclude && connection.readyState === connection.OPEN) {
      connection.send(messageStr);
    }
  });
}

function handleMessage(ws: ExtendedWebSocket, message: any) {
  if (
    typeof message !== "object" ||
    message === null ||
    typeof message.type !== "string"
  ) {
    console.warn("Invalid message structure");
    return;
  }
  const messageStr = JSON.stringify(message);
  if (messageStr.length > 64 * 1024) {
    console.warn("Message too large, dropping");
    return;
  }
  switch (message.type) {
    case "cursor.update":
      if (typeof message.x !== "number" || typeof message.y !== "number") {
        console.warn("Invalid message structure");
        return;
      }
      if (ws.roomId && ws.userId) {
        broadcastToRoom(
          ws.roomId,
          {
            type: "cursor.update",
            userId: ws.userId,
            x: message.x,
            y: message.y,
          },
          ws
        );
      }
      break;
    case "snapshot.request":
      ws.send(JSON.stringify({ type: "snapshot.ack" }));
      break;
    case "ping":
      ws.send(JSON.stringify({ type: "pong" }));
      break;
    default:
      console.log("Unknown message types:", message.type);
  }
}

console.log("websocket server running on port 8080");
