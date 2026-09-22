import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function adminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function roleForEmail(email) {
  return adminEmails().includes(String(email).trim().toLowerCase()) ? "admin" : "student";
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "An account with that email already exists." });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role: roleForEmail(normalizedEmail) });
    return res.status(201).json({ token: signToken(user), user: safeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) return res.status(401).json({ message: "Invalid email or password." });

    const expectedRole = roleForEmail(normalizedEmail);
    if (user.role !== expectedRole) {
      user.role = expectedRole;
      await user.save();
    }

    return res.json({ token: signToken(user), user: safeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not log in." });
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { name } },
      { new: true, runValidators: true },
    );

    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user: { ...safeUser(user), createdAt: user.createdAt } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update profile." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("name email role createdAt");
  if (!user) return res.status(404).json({ message: "User not found." });

  const expectedRole = roleForEmail(user.email);
  if (user.role !== expectedRole) {
    user.role = expectedRole;
    await user.save();
  }

  return res.json({ user: { ...safeUser(user), createdAt: user.createdAt } });
});

export default router;

