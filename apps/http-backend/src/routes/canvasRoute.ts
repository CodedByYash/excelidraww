import express from "express";
import middleware from "../middleware";
import { getLatestCanvas, saveCanvas } from "../controller/canvasController";

const router = express.Router({ mergeParams: true });

router.use(middleware);
router.get("/latest", getLatestCanvas);
router.post("/", saveCanvas);

export default router;
