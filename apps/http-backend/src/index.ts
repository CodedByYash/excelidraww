import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/authRoute";

const app = express();

app.use(express.json());
app.use(helmet());
const allowedOrigin = process.env.WEB_APP_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use("/auth", authRouter);
// Room routes will be mounted later, keep placeholder
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
