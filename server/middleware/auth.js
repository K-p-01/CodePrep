import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Authentication required." });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("role email");
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    req.currentUser = user;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not verify admin access." });
  }
}

