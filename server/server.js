import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import progressRoutes from "./routes/progress.js";
import contentRoutes from "./routes/content.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "codeprep-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/content", contentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error("MONGODB_URI and JWT_SECRET must be configured in server/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`CodePrep API running on http://127.0.0.1:${port}`));
}

start().catch((error) => {
  console.error("CodePrep API failed to start:", error.message);
  process.exit(1);
});

