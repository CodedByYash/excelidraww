import express from "express";
import middleware from "../middleware";
import {
  createRoom,
  getRoomById,
  joinRoom,
  listMyRooms,
} from "../controller/roomController";

const router = express.Router();

router.use(middleware);

router.post("/", createRoom);
router.get("/", listMyRooms);
router.post("/:id/join", joinRoom);
router.get("/:id", getRoomById);

export default router;
