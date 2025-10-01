import { CreateRoomSchema, RoomIdParamSchema } from "@repo/common/types";
import prisma from "@repo/db/client";
import { Request, RequestHandler, Response } from "express";

const toSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

async function getUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 0;
  while (true) {
    const existing = await prisma.room.findUnique({ where: { slug } });
    if (!existing) return slug;
    suffix++;
    slug = `${base}-${suffix}`;
  }
}

export const createRoom: RequestHandler = async (
  req: Request,
  res: Response
) => {
  //@ts-ignore
  const auth = req.auth;
  const parsed = CreateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: "Invalid request", error: parsed.error.errors });
    return;
  }
  const base = toSlug(parsed.data.name);
  const slug = await getUniqueSlug(base);
  const room = await prisma.room.create({
    data: {
      slug,
      adminId: auth.userId,
      users: { connect: { id: auth.userId } },
    },
    select: { id: true, slug: true, createdAt: true },
  });

  res
    .status(201)
    .location(`/rooms/${room.id}`)
    .json({ id: room.id, slug: room.slug, createdAt: room.createdAt });
};

export const listMyRooms: RequestHandler = async (
  req: Request,
  res: Response
) => {
  //@ts-ignore
  const auth = req.auth;
  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ adminId: auth.userId }, { users: { some: { id: auth.userId } } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, slug: true, adminId: true },
  });
  res.json({ rooms });
};

export const joinRoom: RequestHandler = async (req: Request, res: Response) => {
  //@ts-ignore
  const auth = req.auth;
  const parsedParams = await RoomIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ message: "Invalid room id" });
    return;
  }
  const { id } = parsedParams.data;
  const room = await prisma.room.findUnique({
    where: { id },
    select: {
      id: true,
      users: { where: { id: auth.userId }, select: { id: true } },
    },
  });

  if (!room) {
    res.status(404).json({ message: "Room not found" });
    return;
  }
  const alreadyMember = room.users.length > 0;
  if (!alreadyMember) {
    await prisma.room.update({
      where: { id },
      data: {
        users: { connect: { id: auth.userId } },
      },
    });
  }
  res.status(204).send();
};

export const getRoomById: RequestHandler = async (
  req: Request,
  res: Response
) => {
  //@ts-ignore
  const auth = req.auth;
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ message: "Invalid room id" });
    return;
  }

  const room = await prisma.room.findFirst({
    where: {
      id,
      OR: [{ adminId: auth.userId }, { users: { some: { id: auth.userId } } }],
    },
    select: {
      id: true,
      slug: true,
      adminId: true,
      createdAt: true,
    },
  });

  if (!room) {
    res.status(404).json({ message: "Room not found" });
    return;
  }
  res.json({ room });
};
