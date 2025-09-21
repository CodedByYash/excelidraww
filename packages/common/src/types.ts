import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(60),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const SigninSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const CreateRoomSchema = z.object({
  name: z.string().trim().min(3).max(60),
});

export const RoomIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const RoomParamSchema = z.object({
  roomId: z.string().uuid(),
});

export const SaveCanvasSchema = z.object({
  design: z.any(),
});

export type WsServerEvent =
  | { type: "presence.join"; userId: string; email: string }
  | { type: "presence.leave"; userId: string }
  | { type: "presence.update"; userId: string; x: number; y: number }
  | { type: "snapshot.push"; design: any }
  | { type: "snapshot.ack" };

export type WsClientEvent =
  | { type: "cursor.update"; x: number; y: number }
  | { type: "snapshot.request" };

export type WsMessage = WsServerEvent | WsClientEvent;
