import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    subjects: { type: Array, default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Content", contentSchema);

