import { CreateUserSchema, SigninSchema } from "@repo/common/types";
import { Request, Response } from "express";
import client from "@repo/db/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

export const signup = async (req: Request, res: Response) => {
  try {
    const parsedBody = CreateUserSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        message: "Invalid credentials",
        error: parsedBody.error.errors,
        success: false,
      });
      return;
    }
    const { name, email, password } = parsedBody.data;

    const salt = bcrypt.genSaltSync(5);
    const hashedpassword = await bcrypt.hash(password, salt);

    const existingUser = await client.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const user = await client.user.create({
      data: {
        email,
        name,
        password: hashedpassword,
      },
    });

    res.status(200).json({ message: "Signup Successful" });
    return;
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

export const signin = async (req: Request, res: Response) => {
  const parsedBody = SigninSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ message: "Invalid credentials", error: parsedBody.error });
    return;
  }

  const { email, password } = parsedBody.data;
  try {
    const foundedUser = await client.user.findUnique({ where: { email } });
    if (!foundedUser) {
      res.status(403).json({ message: "Invalid Credentials" });
      return;
    }
    const isValid = await bcrypt.compare(password, foundedUser.password);
    if (!isValid) {
      res.status(403).json({ message: "Invalid Credentials" });
      return;
    }
    const token = jwt.sign(
      { userId: foundedUser.id, email: foundedUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (e) {
    res.status(500).json({ message: "Server side error" });
  }
};

export const me = async (req: Request, res: Response) => {
  // @ts-ignore
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const user = await client.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ user });
  } catch (e) {
    res.status(500).json({ message: "Server side error" });
  }
};
