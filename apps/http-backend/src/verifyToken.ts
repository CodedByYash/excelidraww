import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
  email: string;
}

export const verifyToken = (
  token: string,
  JWT_SECRET: string
): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET as string) as TokenPayload;
  } catch {
    return null;
  }
};
