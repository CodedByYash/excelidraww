import { JWT_SECRET } from "@repo/backend-common/config";
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "./verifyToken";

interface AuthRequest extends Request {
  auth?: { userId: string; email: string };
}
export default function middleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers["authorization"] ?? "";
    if (!authHeader) {
      res.status(401).json({ message: "No token provided" });
      return;
    }
    const parts = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = parts.startsWith("Bearer ") ? parts.slice(7) : parts;

    const decoded = verifyToken(token, JWT_SECRET as string);

    if (!decoded) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    req.auth = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    res.status(500).json({ messgae: "server side error" });
    return;
  }
}
