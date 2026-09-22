import { Router } from "express";
import Content from "../models/Content.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const CONTENT_KEY = "default";

async function loadBuiltInSubjects() {
  const module = await import("../../src/data/subjects.js");
  return module.subjects;
}

function validateSubjects(subjects) {
  if (!Array.isArray(subjects)) return "subjects must be an array.";
  for (const subject of subjects) {
    if (!subject?.id || !subject?.name || !Array.isArray(subject?.topics)) {
      return "Each subject needs id, name, and topics.";
    }
    for (const topic of subject.topics) {
      if (!topic?.id || !topic?.title || !topic?.practice) return "Each topic needs id, title, and practice data.";
      if (!Array.isArray(topic.resources) || !Array.isArray(topic.notes)) return "Each topic needs resources and notes arrays.";
    }
  }
  return null;
}

router.get("/", async (_req, res) => {
  try {
    const record = await Content.findOne({ key: CONTENT_KEY }).lean();
    if (record?.subjects?.length) {
      return res.json({ subjects: record.subjects, source: "database", updatedAt: record.updatedAt });
    }
    return res.json({ subjects: await loadBuiltInSubjects(), source: "builtin", updatedAt: null });
  } catch (error) {
    console.error(error);
    try {
      return res.json({ subjects: await loadBuiltInSubjects(), source: "builtin", updatedAt: null });
    } catch {
      return res.status(500).json({ message: "Could not load content." });
    }
  }
});

router.use(requireAuth, requireAdmin);

router.post("/seed", async (req, res) => {
  try {
    const subjects = await loadBuiltInSubjects();
    const record = await Content.findOneAndUpdate(
      { key: CONTENT_KEY },
      { $set: { subjects, updatedBy: req.currentUser._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return res.json({ subjects: record.subjects, source: "database", updatedAt: record.updatedAt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not seed content." });
  }
});

router.put("/", async (req, res) => {
  try {
    const subjects = req.body?.subjects;
    const validationError = validateSubjects(subjects);
    if (validationError) return res.status(400).json({ message: validationError });

    const record = await Content.findOneAndUpdate(
      { key: CONTENT_KEY },
      { $set: { subjects, updatedBy: req.currentUser._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({ subjects: record.subjects, source: "database", updatedAt: record.updatedAt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not save content." });
  }
});

export default router;

