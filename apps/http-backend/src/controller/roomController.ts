import { CreateRoomSchema, RoomIdParamSchema } from "@repo/common/types";
import prisma from "@repo/db/client";
import { Request, Response } from "express";

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

export const createRoom = async (req: Request, res: Response) => {
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
    .location(`/room/${room.id}`)
    .json({ id: room.id, slug: room.slug, createdAt: room.createdAt });
};

export const listMyRooms = async (req: Request, res: Response) => {
  //@ts-ignore
  const auth = req.auth;
  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ id: auth.userId }, { users: { some: { id: auth.userId } } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, slug: true, adminId: true },
  });
  res.json(rooms);
};

export const joinRoom = async (req: Request, res: Response) => {
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

// ADMIN@DESKTOP-BAPDV3G MINGW64 /d/yash/Projects/excelidraww (main)
// $ curl -s -X POST http://localhost:3000/rooms  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN"  -d '{"name":"My First Room"}' | cat
// {"id":"1058e875-cea8-43af-a460-ca7f81200a14","slug":"my-first-room","createdAt":"2025-09-19T10:22:45.040Z"}
// ADMIN@DESKTOP-BAPDV3G MINGW64 /d/yash/Projects/excelidraww (main)
// $ curl -s http://localhost:3000/rooms \
// >  -H "Authorization: Bearer $TOKEN" | cat
// [{"id":"1058e875-cea8-43af-a460-ca7f81200a14","createdAt":"2025-09-19T10:22:45.040Z","slug":"my-first-room","adminId":"66f0ba7c-c916-4291-8dd6-58a9ce9b6bae"}]
// ADMIN@DESKTOP-BAPDV3G MINGW64 /d/yash/Projects/excelidraww (main)
// $ curl -s -X POST http://localhost:3000/rooms/<roomId>/join \
// >  -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
// bash: roomId: No such file or directory

// ADMIN@DESKTOP-BAPDV3G MINGW64 /d/yash/Projects/excelidraww (main)
// $
