import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";

export const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // PRODUCTION UPDATE: Cross-site cookie configuration
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: isProduction, // MUST be true if SameSite is 'none'
    sameSite: isProduction ? "none" : "strict", // 'none' allows Vercel to talk to Render
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError("Email already in use", 400);

    const user = await User.create({ email, passwordHash: password });
    generateTokenAndSetCookie(res, user._id);

    res
      .status(201)
      .json({ success: true, data: { id: user._id, email: user.email } });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new AppError("Invalid email or password", 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError("Invalid email or password", 401);

    generateTokenAndSetCookie(res, user._id);
    res
      .status(200)
      .json({ success: true, data: { id: user._id, email: user.email } });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    expires: new Date(0),
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const getMe = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};
