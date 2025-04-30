import express, { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import client from "@repo/db/client";

const app = express();
const saltRounds = 5;

app.use(express.json()); // ⬅️ Also add this to parse JSON body

app.post("/signup", async (req: Request, res: Response) => {
  const Schema = z.object({
    email: z.string().min(3).max(100),
    firstname: z.string().min(3).max(30),
    lastname: z.string().min(3).max(30),
    password: z.string().min(8).max(30),
  });

  const parsedBody = Schema.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ message: "Invalid credentials", error: parsedBody.error });
    return;
  }

  try {
    const { firstname, lastname, email, password } = parsedBody.data;

    const salt = bcrypt.genSaltSync(saltRounds);
    const hashedpassword = await bcrypt.hash(password, salt);

    const existingUser = await client.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const user = await client.user.create({
      data: {
        email,
        firstname,
        lastname,
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
});
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
