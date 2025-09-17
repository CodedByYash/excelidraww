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

export const CreateRoom = z.object({
  name: z.string().trim().min(3).max(60),
});
