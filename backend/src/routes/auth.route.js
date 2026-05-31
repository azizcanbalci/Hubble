import { Router } from "express";
import { register, login, updateProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.patch("/profile", protectRoute, updateProfile);

export default router;
