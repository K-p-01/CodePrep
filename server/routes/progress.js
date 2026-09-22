import { Router } from "express";
import Progress from "../models/Progress.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const record = await Progress.findOne({ userId: req.user.id }).lean();
    return res.json({ progress: record?.data ?? {} });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load progress." });
  }
});

router.put("/", async (req, res) => {
  try {
    const progress = req.body?.progress;
    if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
      return res.status(400).json({ message: "Progress must be an object." });
    }

    const record = await Progress.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { data: progress } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({ progress: record.data, updatedAt: record.updatedAt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not save progress." });
  }
});

export default router;

