import { RoomParamSchema, SaveCanvasSchema } from "@repo/common/types";
import prisma from "@repo/db/client";
import { Request, Response } from "express";
import crypto from "crypto";

async function ensureMember(roomId: string, userId: string) {
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      OR: [{ adminId: userId }, { users: { some: { id: userId } } }],
    },
    select: { id: true },
  });
  return !!room;
}

export const getLatestCanvas = async (req: Request, res: Response) => {
  //@ts-ignore
  const auth = req.auth;
  const params = RoomParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid room id" });
    return;
  }

  const roomId = params.data.roomId;

  const allowed = await ensureMember(roomId, auth.userId);
  if (!allowed) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const latest = await prisma.canvas.findFirst({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    select: { id: true, design: true, userId: true, createdAt: true },
  });

  if (!latest) {
    res.status(204).send();
    return;
  }

  res.json({ canvas: latest });
};

export const saveCanvas = async (req: Request, res: Response) => {
  //@ts-ignore
  const auth = req.auth;
  const params = RoomParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: "Invalid room id" });
    return;
  }
  const body = SaveCanvasSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: "Invalid body", error: body.error.errors });
    return;
  }

  const roomId = params.data.roomId;

  const allowed = await ensureMember(roomId, auth.userId);
  if (!allowed) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const id = crypto.randomUUID();
  await prisma.canvas.create({
    data: {
      id,
      roomId,
      userId: auth.userId,
      design: body.data.design,
    },
  });

  res.status(201).json({ id });
};
