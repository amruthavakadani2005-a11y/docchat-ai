import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  authSchema,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = express.Router();

router.post("/register", validateRequest(authSchema), register);
router.post("/login", validateRequest(authSchema), login);
router.post("/logout", logout);

// Notice the 'protect' middleware is applied here before 'getMe'
router.get("/me", protect, getMe);

export default router;
