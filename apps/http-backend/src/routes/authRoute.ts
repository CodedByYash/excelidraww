import express from "express";
import middleware from "../middleware";
import { signup, signin, me } from "../controller/authController";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", middleware, me);

export default router;
