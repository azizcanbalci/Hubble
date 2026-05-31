import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export const protectRoute = async (req, res, next) => {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    const token = header.split(" ")[1];

    // Try custom JWT first
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET);
      if (decoded?.userId) {
        req.userId = decoded.userId;
        return next();
      }
    } catch (_) {
      // Not a custom JWT — fall through to Clerk
    }

    // Try Clerk token
    try {
      const clerkAuth = req.auth();
      if (clerkAuth?.isAuthenticated) {
        req.userId = clerkAuth.userId;
        return next();
      }
    } catch (_) {
      // Clerk validation failed
    }
  }

  return res.status(401).json({ message: "Unauthorized - you must be logged in" });
};
