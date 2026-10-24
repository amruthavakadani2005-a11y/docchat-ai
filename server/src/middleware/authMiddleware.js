import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AppError } from "./errorHandler.js";

export const protect = async (req, res, next) => {
  try {
    // 1. Check if the token exists in the cookies
    const token = req.cookies.jwt;
    if (!token) {
      throw new AppError(
        "Not authorized to access this route. Please log in.",
        401,
      );
    }

    // 2. Verify the token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user associated with the token
    // We exclude the passwordHash from the result for security
    const currentUser = await User.findById(decoded.id).select("-passwordHash");
    if (!currentUser) {
      throw new AppError(
        "The user belonging to this token no longer exists.",
        401,
      );
    }

    // 4. Attach the user object to the request so controllers can use it (e.g., req.user._id)
    req.user = currentUser;
    next();
  } catch (error) {
    // If jwt.verify fails, it throws an error. We catch it and send a 401.
    next(new AppError("Not authorized, token failed.", 401));
  }
};
